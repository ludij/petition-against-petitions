const exphbs = require('express-handlebars');

exports.hbs = exphbs.create({
    defaultLayout: 'main',
    helpers: {
        properCase: function(str) {
            return str.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
        },
        properUrl: function(url) {
            if (url == null || url.indexOf('http') != -1) {
                return url;
            } else {
                return url = `http://${url}`;
            }
        }
    }
});
