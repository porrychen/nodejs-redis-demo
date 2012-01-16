
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')

var fs = require('fs'),
    formidable = require('formidable'),
    redis = require('redis'),
    client = redis.createClient(),
    readFilePath = './data',
    readFileName = 'test.gif';

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  delete express.bodyParser.parse['multipart/form-data'];
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', routes.index);

app.post('/', function(req, res, next) {
    // parse application/x-www-form-urlencoded and application/json
//    console.log(req.body.images);

    var form = new formidable.IncomingForm();
    form.uploadDir = readFilePath;

    var filename = readFilePath + '/' + readFileName;
    form.parse(req, function(error, fields, files) {
        if (error) {
            next(error);
        } else {
            var filepath = files['images']['path'];

            fs.renameSync(filepath, filename);

            fs.readFile(filename, function (err, data) {
                if (err) throw err;

                console.log("Read " + data.length + " bytes from filesystem.");

                client.set(filename, data, redis.print); // set entire file
                client.get(filename, function (err, reply) { // get entire file
                    if (err) {
                        console.log("Get error: " + err);
                    } else {
                        fs.writeFile(readFilePath + "/duplicate_" + readFileName, reply, function (err) {
                            if (err) {
                                console.log("Error on write: " + err)
                            } else {
                                console.log("File written.");
                            }
                            client.end();

//                            res.render('show', {title: 'Show Image ', name: files.upload.filename, path: 'images/test.gif'});
                        });
                    }
                });
            });
        }
    });

});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
