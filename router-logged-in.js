const express = require('express');
const router = express.Router();
const {redirectIfLoggedIn, redirectIfLoggedOut, redirectIfSigned, redirectIfNotSigned} = require('./middleware');
const db = require('./db.js');

exports.routerLoggedIn = router;

router.get('/profile', redirectIfLoggedOut, function(req, res) {
    if (req.session.user.sign_id) {
        res.redirect('/petition');
        return;
    }
    res.render('profile', {
        userDetails: req.session.user
    });
});

router.post('/profile', redirectIfLoggedOut, function(req, res) {
    db.upsertProfile(req.session.user.id, req.body)
        .then(() => {
            return db.selectUser(req.session.user.email);
        })
        .then(userDetails => {
            db.putUserInSession(req, userDetails);
            res.redirect('/petition');
        })
        .catch(err => console.log('error in post profile: ', err));
});

router.get('/profile/edit', redirectIfLoggedOut, function(req, res) {
    res.render('profile-edit', {
        userDetails: req.session.user
    });
});

router.post('/profile/edit', redirectIfLoggedOut, function(req, res) {
    if (req.body.email.indexOf('@') == -1) {
        let errorPlaceholder = "You didn't provide a valid email address, please try again";
        res.render('profile-edit', {
            userDetails: req.session.user,
            errorPlaceholder: errorPlaceholder
        });
        return;
    }
    db.hashPassword(req.body.password)
        .then(hash => {
            Promise.all([
                db.updateUser(req.body, req.session.user.id, hash),
                db.upsertProfile(req.session.user.id, req.body)
            ]);
        })
        .then(() => {
            return db.selectUser(req.body.email);
        })
        .then(userDetails => {
            db.putUserInSession(req, userDetails);
            res.redirect('/petition');
        })
        .catch(err => console.log('error in post profile/edit: ', err));
});

router.post('/profile/delete', redirectIfLoggedOut, function(req, res) {
    Promise.all([
        db.deleteSign(req.session.user.id),
        db.deleteProfileAndUser(req.session.user.id)
    ])
        .then(() => {
            res.redirect('/logout');
        })
        .catch(err => console.log('error in post thanks: ', err));
});

router.get('/petition', redirectIfLoggedOut, redirectIfSigned, function(req, res) {
    if (req.session.user.sign_id) {
        res.redirect('/thanks');
    } else {
        res.render('petition', {
            userDetails: req.session.user,
            script: 'main.js'
        });
    }
});

router.post('/petition', redirectIfLoggedOut, redirectIfSigned, function(req, res) {
    db.insertSign(req.session.user.id, req.body.sign, req.session.user.city)
        .then(() => {
            req.session.user.sign_id = req.session.user.id;
            res.redirect('/thanks');
        })
        .catch(err => {
            let errorPlaceholder = "No signature provided, please try again";
            console.log('error in post petition: ', err);
            res.render('petition', {
                userDetails: req.session.user,
                script: 'main.js',
                errorPlaceholder: errorPlaceholder
            });
        });
});

router.get('/thanks', redirectIfLoggedOut, redirectIfNotSigned, (req, res) => {
    db.getSign(req.session.user.id)
        .then(sign => {
            res.render('thanks', {
                userDetails: req.session.user,
                sign: sign.rows
            });
        })
        .catch(err => console.log('error in get thanks: ', err));
});

router.post('/thanks', redirectIfLoggedOut, redirectIfNotSigned, function(req, res) {
    db.deleteSign(req.session.user.id, req.session.user.city)
        .then(() => {
            req.session.user.sign_id = null;
            res.redirect('/petition');
        })
        .catch(err => console.log('error in post thanks: ', err));
});

router.get('/signees', redirectIfLoggedOut, redirectIfNotSigned, (req, res) => {
    db.getSignees()
        .then(result => {
            res.render('signees', {
                signees: result.rows
            });
        })
        .catch(err => console.log('error in get signees: ', err));
});

router.get('/signees/:city', redirectIfLoggedOut, redirectIfNotSigned, (req, res) => {
    db.getSignees(req.params.city)
        .then(result => {
            res.render('signees', {
                signees: result.rows,
                currentCity: req.params.city
            });
        })
        .catch(err => console.log('error in get signees/:city : ', err));
});

router.get('/logout', redirectIfLoggedOut, (req, res) => {
    req.session.destroy(err => console.log('error in destroying session: ', err));
    res.redirect('/welcome');
});

router.get('/*', redirectIfLoggedIn, redirectIfLoggedOut);
