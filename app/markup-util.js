
var markup_context 	= require('./markup-context.js');

var path 						= require('path');
var _s 							= require('underscore.string');

var markup_util = {

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

	/**
	 * Get meta information from Markdown content
	 * 从md文件头部的\/\* \*\/中获取meta信息
	 */
	processMeta: function(markdownContent) {
		var metaArr = markdownContent.match(markup_util._metaRegex),
		meta = {};

		var metaString = metaArr ? metaArr[1].trim() : '';
		if(metaString){
			var metas = metaString.match(/(.*): (.*)/ig);
			metas.forEach(function(item){
				var parts = item.split(': ');
				if(parts[0] && parts[1]){
					meta[markup_util.cleanString(parts[0], true)] = parts[1].trim();
				}
			});
		}

		return meta;
	},

	// Strip meta from Markdown content
	stripMeta: function(markdownContent) {
		return markdownContent.replace(markup_util._metaRegex, '').trim();
	},

	// Replace content variables in Markdown content
	processVars: function(markdownContent) {
		if(typeof markup_context.config.base_url !== 'undefined') {
			markdownContent = markdownContent.replace(/\%base_url\%/g, markup_context.config.base_url);
		}
		if (typeof markup_context.config.image_url !== 'undefined') {
			markdownContent = markdownContent.replace(/\%image_url\%/g, markup_context.config.image_url);
		}
		if(typeof markup_context.config.copyright != 'undefined') {
			markdownContent = markdownContent.replace(/\%copyright\%/g, markup_context.config.copyright);
		}
		if(typeof markup_context.config.ad != 'undefined') {
			markdownContent = markdownContent.replace(/\%ad\%/g, markup_context.config.ad);
		}
		return markdownContent;
	}

};

module.exports = markup_util;
