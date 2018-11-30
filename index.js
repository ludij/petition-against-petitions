const express = require('express');
const app = express();

const {hbs} = require('./hbs.js');
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

const session = require('express-session');
const Store = require('connect-redis')(session);

let store = {};
let secrets;
if (process.env.NODE_ENV == 'production') {
    store = {
        url: process.env.REDIS_URL
    };
    secrets = process.env;
} else {
    store = {
        ttl: 60*60*24,
        host: 'localhost',
        port: 6379
    };
    secrets = require('./secrets');
}

app.use(session({
    store: new Store(store),
    resave: false,
    saveUninitialized: true,
    secret: secrets.secretString
}));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

const csurf = require('csurf');
app.use(csurf());

const {routerLoggedOut} = require('./router-logged-out');
const {routerLoggedIn} = require('./router-logged-in');

app.use(express.static('./public'));

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use(routerLoggedOut);

app.use(routerLoggedIn);

app.listen(process.env.PORT || 8080, () => {
    console.log('listening on port 8080');
});
