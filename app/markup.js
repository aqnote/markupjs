
'use strict';

// markup系统模块
var markup_util        = require('./markup-util.js');
var markup_action      = require('./markup-action.js');
var markup_context     = require('./markup-context.js');
// markdown解析器
var marked        = require('marked');
// web开发相关
var express       = require('express');
var hogan         = require('hogan-express');
var favicon       = require('serve-favicon');
var cookie_parser = require('cookie-parser');
var body_parser   = require('body-parser');
// 文件操作相关
var path          = require('path');
var fs            = require('fs');
// 日志系统
var logger        = require('morgan');
var _s            = require('underscore.string');
// 日期格式化
var moment        = require('moment');
// 表单验证工具
var validator     = require('validator');
// 对象拷贝工具
var extend        = require('extend');

function initialize (config) {

  // New Express App
  var app = express();

  // Setup Port， 设置服务器监听端口
  app.set('port', process.env.PORT || 8080);

  // Setup Views，如果没设置采用默认模版
  if (!config.theme_dir)  { config.theme_dir  = path.join(__dirname, '..', 'themes'); }
  if (!config.theme_name) { config.theme_name = 'default'; }
  app.set('views', path.join(config.theme_dir, config.theme_name, 'templates'));
  app.set('layout', 'layout');
  app.set('view engine', 'html');
  app.enable('view cache');
  app.engine('html', hogan);

  // Setup Express
  app.use(favicon(config.public_dir + '/favicon.ico'));
  app.use(logger('dev'));
  app.use(body_parser.json());
  app.use(body_parser.urlencoded({ extended : false }));
  app.use(cookie_parser());
  app.use(express.static(config.public_dir));

  // Setup config
  extend(markup_context.config, config);

  // Online Editor Routes，在线编辑
  if (config.allow_editing === true) {

    app.post('/md-edit', function (req, res, next) {
      var filePath = path.normalize(markup_context.config.content_dir + req.body.file);
      if (!fs.existsSync(filePath)) { filePath += '.md'; }
      fs.writeFile(filePath, req.body.content, function (err) {
        if (err) {
          console.log(err);
          return res.json({
            status  : 1,
            message : err
          });
        }
        res.json({
          status  : 0,
          message : 'Page Saved'
        });
      });
    });

    app.post('/md-delete', function (req, res, next) {
      var filePath = path.normalize(markup_context.config.content_dir + req.body.file);
      if (!fs.existsSync(filePath)) { filePath += '.md'; }
      fs.rename(filePath, filePath + '.del', function (err) {
        if (err) {
          console.log(err);
          return res.json({
            status: 1,
            message: err
          });
        }
        res.json({
          status: 0,
          message: 'Page Deleted'
        });
      });
    });

    app.post('/md-add-category', function (req, res, next) {
      var filePath = path.normalize(markup_context.config.content_dir + req.body.category);
      fs.mkdir(filePath, function (err) {
        if (err) {
          console.log(err);
          return res.json({
            status  : 1,
            message : err
          });
        }
        res.json({
          status  : 0,
          message : 'Category Created'
        });
      });
    });

    app.post('/md-add-page', function (req, res, next) {
      var filePath = path.normalize(markup_context.config.content_dir + (!!req.body.category ? req.body.category + '/' : '') + req.body.name + '.md');
      fs.open(filePath, 'a', function (err, fd) {
        fs.close(fd);
        if (err) {
          console.log(err);
          return res.json({
            status  : 1,
            message : err
          });
        }
        res.json({
          status  : 0,
          message : 'Page Created'
        });
      });
    });

  }

  // Handle all requests
  app.get('*', function (req, res, next) {

    var suffix = 'edit';
    console.log("req.params[0]: " + req.params[0]);
    if (req.query.search) {

      var searchQuery    = validator.toString(validator.escape(_s.stripTags(req.query.search))).trim();
      console.log('search query: ' + searchQuery);
      var searchResults  = markup_action.doSearch(searchQuery);
      var pageListSearch = markup_action.getPages('');

      return res.render('search', {
        config: config,
        pages: pageListSearch,
        search: searchQuery,
        searchResults: searchResults,
        body_class: 'page-search'
      });

    } else if (req.params[0]) {

      var slug = req.params[0];
      if (slug === '/') { slug = '/index'; }
      // add sub dir index
      if (slug[slug.length - 1] == '/') { slug = slug + 'index'; };

      var pageList     = markup_action.getPages(slug);
      var filePath     = path.normalize(markup_context.config.content_dir + slug);
      var filePathOrig = filePath;

      if (filePath.indexOf(suffix, filePath.length - suffix.length) !== -1) {
        filePath = filePath.slice(0, - suffix.length - 1);
      }
      if (!fs.existsSync(filePath)) { filePath += '.md'; }

      if (slug === '/index' && !fs.existsSync(filePath)) {

        var stat = fs.lstatSync(path.join(config.theme_dir, config.theme_name, 'templates', 'home.html'));
        return res.render('home', {
          config        : config,
          pages         : pageList,
          body_class    : 'page-home',
          last_modified : moment(stat.mtime).format('Do MMM YYYY')
        });

      } else {
        // 编辑
        if (filePathOrig.indexOf(suffix, filePathOrig.length - suffix.length) !== -1) {

          fs.readFile(filePath, 'utf8', function (err, content) {
            if (err) {
              err.status = '404';
              err.message = 'Whoops. Looks like this page doesn\'t exist.';
              return next(err);
            }

            if (path.extname(filePath) === '.md') {

              // File info
              var stat = fs.lstatSync(filePath);
              // Meta
              var meta = markup_util.processMeta(content);
              content = markup_util.stripMeta(content);
              if (!meta.title) { meta.title = markup_util.slugToTitle(filePath); }

              // Content
              content      = markup_util.processVars(content);
              var html     = content;
              var template = meta.template || 'page';

              return res.render('edit', {
                config: config,
                pages: pageList,
                meta: meta,
                content: html,
                body_class: template + '-' + markup_util.cleanString(slug),
                last_modified: moment(stat.mtime).format('Do MMM YYYY')
              });

            }
          });

        } else {
          // 展示
          fs.readFile(filePath, 'utf8', function (err, content) {

            if (err) {
              err.status = '404';
              err.message = 'Whoops. Looks like this page doesn\'t exist.';
              return next(err);
            }

            // Process Markdown files
            if (path.extname(filePath) === '.md') {

              // File info
              var stat = fs.lstatSync(filePath);

              // Meta，处理meta信息
              var meta = markup_util.processMeta(content);
              if (!meta.title) { meta.title = markup_util.slugToTitle(filePath); }

              // Content
              content = markup_util.stripMeta(content);
              content = markup_util.processVars(content);
              // BEGIN: DISPLAY, NOT EDIT
              marked.setOptions({
                langPrefix: ''
              });
              var html = marked(content);
              // END: DISPLAY, NOT EDIT
              var template = meta.template || 'page';

              return res.render(template, {
                config        : config,
                pages         : pageList,
                meta          : meta,
                content       : html,
                body_class    : template + '-' + markup_util.cleanString(slug),
                last_modified : moment(stat.mtime).format('Do MMM YYYY')
              });

            } else {
              // Serve static file
              res.sendfile(filePath);
            }

          });

        }

      }

    } else {
      next();
    }

  });

  // Error-Handling Middleware
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      config     : config,
      status     : err.status,
      message    : err.message,
      error      : {},
      body_class : 'page-error'
    });
  });

  return app;

}

// Exports
module.exports = initialize;
