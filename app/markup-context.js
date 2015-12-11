
var markup_context = {
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
		debug: false,
    // 用户信息
    author_info: '<a href="http://aqnote.com/author">Powered by Yudao</a> <a href="mailto:webmaster@example.com">邮箱</a>, ' + new Date(),
    // 广告
    ad: ''
	}
};

module.exports = markup_context;
