
'use strict';

// 文件操作相关
var path          = require('path');
var fs            = require('fs');

// markdown解析器
var marked        = require('marked');

// markup系统模块
var markup_util        = require('./markup-util.js');
var markup_action      = require('./markup-action.js');
var markup_context     = require('./markup-context.js');

// web开发相关
var express       = require('express');
var hogan         = require('hogan-express');
var favicon       = require('serve-favicon');
var cookie_parser = require('cookie-parser');
var body_parser   = require('body-parser');

// 日志系统
var logger        = require('morgan');
var _s            = require('underscore.string');
// 日期格式化
var moment        = require('moment');
// 表单验证工具
var validator     = require('validator');
// 对象拷贝工具
var extend        = require('extend');

function markup(config) {

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

  // Handle all requests
  app.all('*', function (req, res, next) {

    console.log('Request URI: ' + req.params[0]);
    next(); // pass control to the next handler
});

  // search
  app.get('/_search', function(req, res) {

    console.log("router: /_search");
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
  });

  app.get('*/', function (req, res, next) {

    console.log("router: */");
    var slug = req.params[0];
    if (slug === '/') {
      slug = '/index';
    }

    if (slug[slug.length - 1] == '/') {
      slug = slug + 'index';
    }

    var pageList     = markup_action.getPages(slug);
    var filePath     = path.normalize(markup_context.config.content_dir + slug);

    if (!fs.existsSync(filePath)) {
      filePath += '.md';
    }

    if (slug === '/index' && !fs.existsSync(filePath)) {
      var stat = fs.lstatSync(path.join(config.theme_dir, config.theme_name, 'templates', 'home.html'));
      return res.render('home', {
        config        : config,
        pages         : pageList,
        body_class    : 'page-home',
        last_modified : moment(stat.mtime).format('Do MMM YYYY')
      });
    }
    next();
  });

  // index
  app.get('*', function (req, res, next) {

    console.log("router: *");
    var slug         = req.params[0];
    var filePath     = path.normalize(markup_context.config.content_dir + slug);

    if (!fs.existsSync(filePath)) {
      filePath += '.md';
    }

    // 展示
    fs.readFile(filePath, 'utf8', function (err, content) {

      if (err) {
        err.status = '404';
        err.message = 'Whoops. Looks like this page doesn\'t exist.';
        return next(err);
      }

      if(path.extname(filePath) != '.md') {
        // Serve static file
        res.sendfile(filePath);
        return;
      }

      // File info
      var stat = fs.lstatSync(filePath);

      // html meta
      var html_meta = markup_util.processMeta(content);
      if (!html_meta.title) { html_meta.title = markup_util.slugToTitle(filePath); }

      // html body
      content = markup_util.stripMeta(content);
      content = markup_util.processVars(content);
      marked.setOptions({
        langPrefix: ''
      });
      var html_body = marked(content);

      // user-agent
      var deviceAgent = req.headers["user-agent"].toLowerCase();
      var isMobileAgent = deviceAgent.match(/(iphone|ipad|android)/);

      // get template
      var template = html_meta.template || 'page';

      return res.render(template, {
        config        : config,
        meta          : html_meta,
        content       : html_body,
        body_class    : template + '-' + markup_util.cleanString(slug),
        last_modified : moment(stat.mtime).format('Do MMM YYYY'),
        is_mobile_agent : isMobileAgent
      });
    });
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
module.exports = markup;
