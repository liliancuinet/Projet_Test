var express = require('express');
var Minio = require('minio');
var multiparty = require('multiparty');
var router = express.Router();
const connection = require('../bdd/connection');

var minioClient = new Minio.Client({
  endPoint: '192.168.42.129',
  port: 9000,
  useSSL: false,
  accessKey: 'accessToTest',
  secretKey: 'hHGghglgYhjvbk7646tgyH'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  var param = "";
  var tabDossier = []
  connection.query("SELECT * FROM FICHIER", function(err, rows) {
    var data = [];
    for (let index = 0; index < rows.length; index++) {
      const element = rows[index];
      if (param==element.path) {
        element.fichier=true;
        data.push(element);
      }else{
        var tab = element.path.split("/");
        if (!tabDossier.includes(tab[0])) {
          element.fichier=false;
          var path2 = "";
        console.log(tab);
        for (let i = 0; i < tab.length-1; i++) {
          if (i != tab.length-2) {
            path2 += tab[i]+"+";
          }else{
            path2 += tab[i];
          }
        }
        element.path2 = path2;
        element.nompath = tab[0]+"/";
        tabDossier.push(tab[0]);
        data.unshift(element);
        }
      }
    }
    res.render('index', { title: 'Express', data: data, retour: null });
  })
});

router.get('/add', function(req, res, next) {
  res.render('add');
});


router.post('/add', function(req, res, next) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files){
    if (err) console.log(err);
    var description = fields.description[0];
    var path = fields.path[0];
    if (path.length!=0 && path.charAt(path.length-1)!="/") {
      path += "/";
    }
    console.log(description);
    console.log(path);
    if (files.fichier!=undefined) {
      var file = files.fichier[0].path;
      var name = files.fichier[0].originalFilename;
        var metaData = {
            'Content-Type': 'application/octet-stream',
            'X-Amz-Meta-Testing': 1234,
            'example': 5678
        }
        // Using fPutObject API upload your file to the bucket europetrip.
        minioClient.fPutObject('project', path+files.fichier[0].originalFilename, file, metaData, function(err2, etag) {
          if (err) return console.log(err)
          console.log('File uploaded successfully.')
        });
        connection.query("INSERT INTO fichier (nom, description, path) VALUES ('"+name+"','"+description+"','"+path+"')", function(err3, rows) {
          if (err3) console.log(err3);
          res.redirect("/");
        });
    }
  })
});

router.get('/delete/:id', function(req, res, next) {
  var id = req.params.id;
  console.log(id);
  connection.query("SELECT * FROM fichier where id="+id, function(err, rows) {
    console.log(rows[0].path+rows[0].nom);
    minioClient.removeObject('project', rows[0].path+rows[0].nom, function(err2) {
      if (err2) {
        return console.log('Unable to remove object', err2)
      }
      console.log('Removed the object');
      connection.query("DELETE FROM fichier WHERE id="+id, function(err3, rows2) {
        if (err3) console.log(err3);
        res.redirect("/"); 
      })
    })
  })
})

router.get('/edit/:id', function(req, res, next) {
  var id = req.params.id;
  connection.query("SELECT * FROM fichier WHERE id="+id, function(err, rows) {
    res.render('edit', { data: rows});
  })
})

router.post('/edit', function(req, res, next) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files){
    if (err) console.log(err);
    var description = fields.description[0];
    var id = fields.id[0];
    var path = fields.path[0];
    var oldname = fields.name[0];
    console.log(description);
    console.log(id);
    if (files.fichier[0].originalFilename!="") {
      var file = files.fichier[0].path;
      var name = files.fichier[0].originalFilename;
        var metaData = {
            'Content-Type': 'application/octet-stream',
            'X-Amz-Meta-Testing': 1234,
            'example': 5678
        }
        minioClient.removeObject('project', path+oldname, function(err2) {
          if (err2) return console.log(err2);
          console.log('File remove successfully.');
        })
        minioClient.fPutObject('project', path+files.fichier[0].originalFilename, file, metaData, function(err3, etag) {
          if (err3) return console.log(err3);
          console.log('File uploaded successfully.');
        });
        connection.query("UPDATE fichier SET nom='"+name+"', description='"+description+"' WHERE id="+id, function(err4, rows) {
          if (err4) return console.log(err4);
          res.redirect("/");
        });
    }else{
      connection.query("UPDATE fichier SET description='"+description+"' WHERE id="+id, function(err5, rows2) {
        if (err5) return console.log(err5);
        res.redirect("/");
      });
    }
  })
});



router.get('/move/:id', function(req, res, next) {
  var id = req.params.id;
  connection.query("SELECT * FROM fichier WHERE id="+id, function(err, rows) {
    res.render('move', { data: rows});
  })
});

router.post('/move', function(req, res, next) {
  var id = req.body.id;
  var name = req.body.name;
  var path = req.body.path;
  var pathOld = req.body.pathOld;
  if (path.length!=0 && path.charAt(path.length-1)!="/") {
    path += "/";
  }
  minioClient.copyObject('project', path+name, '/project/'+pathOld+name, null, function(e, data) {
    if (e) {
      return console.log(e);
    }
    console.log("Successfully copied the object:");
    minioClient.removeObject('project', pathOld+name, function(err) {
      if (err) console.log(err);
    })
  })
  connection.query("UPDATE fichier SET path='"+path+"' WHERE id="+id, function(err2, rows) {
    if (err2) console.log(err2);
    res.redirect('/');
  })
});

router.get('/download/:id', function(req, res, next) {
  var id = req.params.id;
  console.log(id);
  connection.query("SELECT * FROM fichier where id="+id, function(err, rows) {
    console.log(rows[0].path+rows[0].nom);
    minioClient.fGetObject('project', rows[0].path+rows[0].nom, "/tmp/"+rows[0].nom ,function(err2) {
      if (err2) {
        return console.log('Unable to download object', err2)
      }
      console.log('The object has downloaded');
      res.download("/tmp/"+rows[0].nom);
    })
  })
});

router.get('/:path', function(req, res, next) {
  var param = req.params.path;
  var tab = param.split("+");
  var nb = tab.length;
  console.log("tab :");
  console.log(tab);
  var tabDossier = []
  param = "";
  var retour = "";
  for (let j = 0; j < nb-1; j++) {
    if (i==nb-2) {
      retour += tab[j];
    }else if (i < nb-2) {
      retour += tab[j] + "+";
    }
  }
  for (let index = 0; index < tab.length; index++) {
    param += tab[index]+"/";
  }
  console.log("param :");
  console.log(param);
  connection.query("SELECT * FROM FICHIER", function(err, rows) {
    var data = [];
    for (let index = 0; index < rows.length; index++) {
      const element = rows[index];
      if (param==element.path) {
        element.fichier=true;
        data.push(element);
        continue;
      }
      var path = "";
      var tab2 = element.path.split("/");
      for (let i = 0; i < nb; i++) {
        path += tab2[i]+"/";
      }
      if (!tabDossier.includes(path)) {
        tabDossier.push(path);
        if (path==param) {
          var path2 = "";
          for (let i = 0; i < tab2.length-1; i++) {
            if (i != tab2.length-2) {
              path2 += tab2[i]+"+";
            }else{
              path2 += tab2[i];
            }
          }
          element.fichier=false;
          element.path2 = path2;
          element.nompath = tab2[nb]+"/";
          data.unshift(element);
        }
      }
    }
    console.log(data);
    res.render('index', { title: 'Express', data: data, retour: retour });
  })
});

module.exports = router;
