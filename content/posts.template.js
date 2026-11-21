---
permalink: /content/posts-manifest.js
---
const BLOG_POST_FILES = [
{% for file in site.static_files %}{% if file.path contains '/posts/' and file.extname == '.js' %}  {{ file.path | remove_first: '/' | jsonify }},
{% endif %}{% endfor %}
];
