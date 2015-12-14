
var markup_context  = require('./markup-context.js');
var markup_util     = require('./markup-util.js');

var glob 						= require('glob');
var	fs 							= require('fs');
var path 						= require('path');
var	_ 							= require('underscore');
var _s 							= require('underscore.string');
var lunr 						= require('lunr');
var marked 					= require('marked');

var markup_action = {
  // 通过url获取md文件
	getPage: function(filePath) {
		try {
			var file = fs.readFileSync(filePath),
				slug = filePath.replace(markup_context.config.content_dir, '').trim();

			if(slug.indexOf('index.md') > -1){
				slug = slug.replace('index.md', '');
			}
			slug = slug.replace('.md', '').trim();

			var meta = markup_util.processMeta(file.toString('utf-8'));
			var content = markup_util.stripMeta(file.toString('utf-8'));
			content = markup_util.processVars(content);
			var html = marked(content);

			return {
				'slug': slug,
				'title': meta.title ? meta.title : markup_util.slugToTitle(slug),
				'body': html,
				'excerpt': _s.prune(_s.stripTags(_s.unescapeHTML(html)), (markup_context.config.excerpt_length || 400))
			};
		}
		catch(e){
			if(markup_context.config.debug) console.log(e);
			return null;
		}
	},

	// Get a structured array of the contents of contentDir
	getPages: function(activePageSlug) {
		activePageSlug = activePageSlug || '';
		var page_sort_meta = markup_context.config.page_sort_meta || '',
			category_sort = markup_context.config.category_sort || false,
			files = glob.sync(markup_context.config.content_dir +'**/*'),
			filesProcessed = [];

		filesProcessed.push({
			slug: '.',
			title: '',
			is_index: true,
			sort: 0,
			files: []
		});

		files.forEach(function(filePath){
        var shortPath = filePath.replace(markup_context.config.content_dir, '').trim(),
				statInfo = fs.lstatSync(filePath);

			if(statInfo.isSymbolicLink()) {
				statInfo = fs.lstatSync(fs.readlinkSync(filePath));
			}

			// 处理目录
			if(statInfo.isDirectory()) {

				var sort = 10;
				var metaFile = markup_context.config.content_dir + shortPath +'/meta';
				metaInfo = {};
				if (fs.existsSync(metaFile) && fs.lstatSync(metaFile).isFile()) {
					fs.readFile(metaFile, 'utf8', function (err, content) {
	          if (err) {
	            err.status = '404';
	            err.message = 'Sytem error. meta';
	            return next(err);
	          }

						metaInfo = markup_util.processMeta(content);
					});

					if("true".match(metaInfo.ignore)) {
						return ;
					}

					if(category_sort){
						try {
							sort = parseInt(metaInfo.sort, 10);
						} catch(e){
							if(markup_context.config.debug) console.log(e);
						}
					}
				}

				filesProcessed.push({
					slug: shortPath,
					title: _s.titleize(_s.humanize(path.basename(shortPath))),
					is_index: false,
					sort: sort,
					files: []
				});
			}

			if(statInfo.isFile() && path.extname(shortPath) == '.md'){
				try {
					var file = fs.readFileSync(filePath);
					var slug = shortPath;
					var pageSort = 0;

					if(shortPath.indexOf('index.md') > -1){
						slug = slug.replace('index.md', '');
					}
					slug = slug.replace('.md', '').trim();

					var dir = path.dirname(shortPath),
					meta = markup_util.processMeta(file.toString('utf-8'));

					if(page_sort_meta && meta[page_sort_meta]) pageSort = parseInt(meta[page_sort_meta], 10);

					var val = _.find(filesProcessed, function(item){ return item.slug == dir; });
					val.files.push({
						slug: slug,
						title: meta.title ? meta.title : markup_util.slugToTitle(slug),
						active: (activePageSlug.trim() == '/'+ slug),
						sort: pageSort
					});
				}	catch(e){
					if(markup_context.config.debug) console.log(e);
				}
			}
		});

		filesProcessed = _.sortBy(filesProcessed, function(cat){ return cat.sort; });
		filesProcessed.forEach(function(category){
			category.files = _.sortBy(category.files, function(file){ return file.sort; });
		});

		return filesProcessed;
	},

	// Index and search contents
	doSearch: function(query) {
		var files = glob.sync(markup_context.config.content_dir +'**/*.md');
		var idx = lunr(function(){
			this.field('title', { boost: 10 });
			this.field('body');
		});

		files.forEach(function(filePath){
			try {
				var shortPath = filePath.replace(markup_context.config.content_dir, '').trim(),
					file = fs.readFileSync(filePath);

				var meta = markup_util.processMeta(file.toString('utf-8'));
				// console.log("====================");
				// console.log("id: " + shortPath);
				// console.log("meta title: " + meta.title);
				// console.log("body: " + file.toString('utf-8'));
				// console.log("====================");
				idx.add({
					'id': shortPath,
					'title': meta.title ? meta.title : markup_util.slugToTitle(shortPath),
					'body': file.toString('utf-8')
				});
			}
			catch(e){
				if(markup_context.config.debug) console.log(e);
			}
		});

		var results = idx.search(query),
			searchResults = [];
		results.forEach(function(result){
            var page = markup_action.getPage(markup_context.config.content_dir + result.ref);
            page.excerpt = page.excerpt.replace(new RegExp('('+ query +')', 'gim'), '<span class="search-query">$1</span>');
            searchResults.push(page);
        });

		return searchResults;
	}
};

module.exports = markup_action;
