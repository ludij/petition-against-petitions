const express = require('express');
const router = express.Router();
const {redirectIfLoggedIn} = require('./middleware');
const db = require('./db.js');

exports.routerLoggedOut = router;

router.get('/welcome', redirectIfLoggedIn, function(req, res) {
    res.render('welcome');
});

router.get('/register', redirectIfLoggedIn, function(req, res) {
    res.render('register');
});

router.post('/register', redirectIfLoggedIn, function(req, res) {
    if (req.body.email.indexOf('@') == -1) {
        let errorPlaceholder = "You didn't provide a valid email address, please try again";
        res.render('register', {
            errorPlaceholder: errorPlaceholder
        });
        return;
    }
    db.hashPassword(req.body.password)
        .then(hash => {
            return db.insertUser(req.body, hash);
        })
        .then(() => {
            return db.selectUser(req.body.email);
        })
        .then(userDetails => {
            db.putUserInSession(req, userDetails);
            res.redirect('/profile');
        })
        .catch(err => {
            let errorPlaceholder;
            if (err.detail.indexOf('already exists') != -1 ) {
                errorPlaceholder = "Email address is already registered";
            }
            else {
                errorPlaceholder = "You didn't fill out all fields, please try again";
            }
            res.render('register', {
                errorPlaceholder: errorPlaceholder
            });
        });
});

router.get('/login', redirectIfLoggedIn, function(req, res) {
    res.render('login');
});

router.post('/login', redirectIfLoggedIn, function(req, res) {
    db.selectUser(req.body.email)
        .then(userDetails => {
            return db.checkPassword(req.body.password, userDetails);
        })
        .then(resolve => {
            if (resolve.doesMatch) {
                db.putUserInSession(req, resolve.userDetails);
                res.redirect('/petition');
            } else {
                let errorPlaceholder = "Incorrect password, please try again";
                res.render('login', {
                    errorPlaceholder: errorPlaceholder
                });
            }
        })
        .catch(err => {
            let errorPlaceholder = "Email address not found, please try again";
            console.log('error in post login: ', err);
            res.render('login', {
                errorPlaceholder: errorPlaceholder
            });
        });
});
