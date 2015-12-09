var path 				= require('path');
var	fs 					= require('fs');
var glob 				= require('glob');
var	_ 					= require('underscore');
var _s 					= require('underscore.string');
var moment 			= require('moment');
var marked 			= require('marked');
var lunr 				= require('lunr');
var validator 	= require('validator');

var markup = {

	// Config array that can be overridden
	config: {
		// The base URL of your site (allows you to use %base_url% in Markdown files)
		base_url: '',
		// The base URL of your images folder (allows you to use %image_url% in Markdown files)
		image_url: '/images',
		// Excerpt length (used in search)
		excerpt_length: 400,
		// The meta value by which to sort pages (value should be an integer)
		// If this option is blank pages will be sorted alphabetically
		page_sort_meta: 'sort',
		// Should categories be sorted numerically (true) or alphabetically (false)
		// If true category folders need to contain a "sort" file with an integer value
		category_sort: true,
		// Specify the path of your content folder where all your '.md' files are located
		content_dir: './content/',
		// Toggle debug logging
		debug: false
	},

	// Regex for page meta
	_metaRegex: /^\/\*([\s\S]*?)\*\//i,

	// Makes filename safe strings
	cleanString: function(str, use_underscore) {
		var u = use_underscore || false;
		str = str.replace(/\//g, ' ').trim();
		if(u){
			return _s.underscored(str);
		} else {
			return _s.trim(_s.dasherize(str), '-');
		}
	},

	// Convert a slug to a title
	slugToTitle: function(slug) {
		slug = slug.replace('.md', '').trim();
		return _s.titleize(_s.humanize(path.basename(slug)));
	},

	// Get meta information from Markdown content
	processMeta: function(markdownContent) {
		var metaArr = markdownContent.match(markup._metaRegex),
			meta = {};

		var metaString = metaArr ? metaArr[1].trim() : '';
		if(metaString){
			var metas = metaString.match(/(.*): (.*)/ig);
			metas.forEach(function(item){
				var parts = item.split(': ');
				if(parts[0] && parts[1]){
					meta[markup.cleanString(parts[0], true)] = parts[1].trim();
				}
			});
		}

		return meta;
	},

	// Strip meta from Markdown content
	stripMeta: function(markdownContent) {
		return markdownContent.replace(markup._metaRegex, '').trim();
	},

	// Replace content variables in Markdown content
	processVars: function(markdownContent) {
		if(typeof markup.config.base_url !== 'undefined') markdownContent = markdownContent.replace(/\%base_url\%/g, markup.config.base_url);
		if (typeof markup.config.image_url !== 'undefined') markdownContent = markdownContent.replace(/\%image_url\%/g, markup.config.image_url);
		return markdownContent;
	},

	// Get a page
	getPage: function(filePath) {
		try {
			var file = fs.readFileSync(filePath),
				slug = filePath.replace(markup.config.content_dir, '').trim();

			if(slug.indexOf('index.md') > -1){
				slug = slug.replace('index.md', '');
			}
			slug = slug.replace('.md', '').trim();

			var meta = markup.processMeta(file.toString('utf-8')),
				content = markup.stripMeta(file.toString('utf-8'));
			content = markup.processVars(content);
			var html = marked(content);

			return {
				'slug': slug,
				'title': meta.title ? meta.title : markup.slugToTitle(slug),
				'body': html,
				'excerpt': _s.prune(_s.stripTags(_s.unescapeHTML(html)), (markup.config.excerpt_length || 400))
			};
		}
		catch(e){
			if(markup.config.debug) console.log(e);
			return null;
		}
	},

	// Get a structured array of the contents of contentDir
	getPages: function(activePageSlug) {
		activePageSlug = activePageSlug || '';
		var page_sort_meta = markup.config.page_sort_meta || '',
			category_sort = markup.config.category_sort || false,
			files = glob.sync(markup.config.content_dir +'**/*'),
			filesProcessed = [];

		filesProcessed.push({
			slug: '.',
			title: '',
			is_index: true,
			class: 'category-index',
			sort: 0,
			files: []
		});

		files.forEach(function(filePath){
            var shortPath = filePath.replace(markup.config.content_dir, '').trim(),
				stat = fs.lstatSync(filePath);

			if(stat.isSymbolicLink()) {
				stat = fs.lstatSync(fs.readlinkSync(filePath));
			}

			if(stat.isDirectory()){
				var sort = 0;

				//ignore directories that has an ignore file under it
				var ignoreFile = markup.config.content_dir + shortPath +'/ignore';
				if (fs.existsSync(ignoreFile) && fs.lstatSync(ignoreFile).isFile()) {
					return true;
				}

				if(category_sort){
					try {
						var sortFile = fs.readFileSync(markup.config.content_dir + shortPath +'/sort');
						sort = parseInt(sortFile.toString('utf-8'), 10);
					}
					catch(e){
						if(markup.config.debug) console.log(e);
					}
				}

				filesProcessed.push({
					slug: shortPath,
					title: _s.titleize(_s.humanize(path.basename(shortPath))),
					is_index: false,
					class: 'category-'+ markup.cleanString(shortPath),
					sort: sort,
					files: []
				});
			}
			if(stat.isFile() && path.extname(shortPath) == '.md'){
				try {
					var file = fs.readFileSync(filePath),
						slug = shortPath,
						pageSort = 0;

					if(shortPath.indexOf('index.md') > -1){
						slug = slug.replace('index.md', '');
					}
					slug = slug.replace('.md', '').trim();

					var dir = path.dirname(shortPath),
						meta = markup.processMeta(file.toString('utf-8'));

					if(page_sort_meta && meta[page_sort_meta]) pageSort = parseInt(meta[page_sort_meta], 10);

					var val = _.find(filesProcessed, function(item){ return item.slug == dir; });
					val.files.push({
						slug: slug,
						title: meta.title ? meta.title : markup.slugToTitle(slug),
						active: (activePageSlug.trim() == '/'+ slug),
						sort: pageSort
					});
				}
				catch(e){
					if(markup.config.debug) console.log(e);
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
		var files = glob.sync(markup.config.content_dir +'**/*.md');
		var idx = lunr(function(){
			this.field('title', { boost: 10 });
			this.field('body');
		});

		files.forEach(function(filePath){
			try {
				var shortPath = filePath.replace(markup.config.content_dir, '').trim(),
					file = fs.readFileSync(filePath);

				var meta = markup.processMeta(file.toString('utf-8'));
				idx.add({
					'id': shortPath,
					'title': meta.title ? meta.title : markup.slugToTitle(shortPath),
					'body': file.toString('utf-8')
				});
			}
			catch(e){
				if(markup.config.debug) console.log(e);
			}
		});

		var results = idx.search(query),
			searchResults = [];
		results.forEach(function(result){
            var page = markup.getPage(markup.config.content_dir + result.ref);
            page.excerpt = page.excerpt.replace(new RegExp('('+ query +')', 'gim'), '<span class="search-query">$1</span>');
            searchResults.push(page);
        });

		return searchResults;
	}

};

module.exports = markup;
