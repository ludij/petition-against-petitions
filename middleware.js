exports.redirectIfLoggedIn = function(req, res, next) {
    if (req.session.user) {
        res.redirect('/petition');
    } else {
        next();
    }
};

exports.redirectIfLoggedOut = function(req, res, next) {
    if (!req.session.user) {
        res.redirect('/welcome');
    } else {
        next();
    }
};

exports.redirectIfSigned = function(req, res, next) {
    if (req.session.user.sign_id) {
        res.redirect('/thanks');
    } else {
        next();
    }
};

exports.redirectIfNotSigned = function(req, res, next) {
    if (!req.session.user.sign_id) {
        res.redirect('/petition');
    } else {
        next();
    }
};
