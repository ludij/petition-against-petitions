const spicedPg = require('spiced-pg');
let secrets;
let db;
if (process.env.NODE_ENV == 'production') {
    db = spicedPg(process.env.DATABASE_URL);
} else {
    secrets = require('./secrets');
    db = spicedPg(`postgres:${secrets.serverUsername}:${secrets.serverPassword}@localhost:5432/petition`);
}
const bcrypt = require('bcryptjs');
const redis = require('./redis.js');

exports.insertUser = function(userInput, hash) {
    return db.query(
        'INSERT INTO users (firstname, lastname, email, password, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [userInput.firstName || null, userInput.lastName || null, userInput.email || null, hash || null, Date()]
    );
};

exports.selectUser = function(email) {
    return db.query(
        `SELECT users.id AS id, users.firstname AS firstname, users.lastname AS lastname, users.email AS email, users.password AS password, profiles.age AS age, profiles.city AS city, profiles.website AS website, signatures.user_id AS sign_id
        FROM users
        LEFT JOIN profiles
        ON users.id = profiles.user_id
        LEFT JOIN signatures
        ON users.id = signatures.user_id
        WHERE users.email = $1`,
        [email]
    );
};

exports.upsertProfile = function(userId, userInput) {
    return db.query(
        `INSERT INTO profiles (user_id, age, city, website, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id)
        DO UPDATE SET age = $2, city = $3, website = $4, timestamp = $5;`,
        [userId || null, userInput.age, userInput.city, userInput.website, Date()]
    )
        .then(() => {
            redis.del('signees');
        });
};

exports.updateUser = function(userInput, id, hash) {
    let q = "";
    let p = [userInput.firstName || null, userInput.lastName || null, userInput.email || null, Date(), id];
    if (hash) {
        q = "password = $6, ";
        p = p.concat([hash || null]);
    }
    return db.query(
        `UPDATE users SET firstname = $1, lastname = $2, email = $3, ${q}timestamp = $4 WHERE id = $5;`,
        p
    )
        .then(() => {
            redis.del('signees');
        });
};

exports.getSign = function(id) {
    return db.query(
        'SELECT sign FROM signatures WHERE user_id = $1;',
        [id]
    );
};

exports.insertSign = function(userId, sign, city) {
    return Promise.all([
        redis.del('signees'),
        redis.del(`${city}signees`)
    ])
        .then(() => {
            return db.query(
                'INSERT INTO signatures (user_id, sign, timestamp) VALUES ($1, $2, $3) RETURNING user_id;',
                [userId || null, sign || null, Date()]
            );
        });
};

exports.deleteSign = function(userId, city) {
    return Promise.all([
        redis.del('signees'),
        redis.del(`${city}signees`)
    ])
        .then(() => {
            return db.query(
                'DELETE FROM signatures WHERE user_id = $1;',
                [userId]
            );
        });
};

exports.deleteProfileAndUser = function(userId) {
    return Promise.all([
        db.query(
            'DELETE FROM profiles WHERE user_id = $1',
            [userId]
        ),
        db.query(
            'DELETE FROM users WHERE id = $1;',
            [userId]
        )
    ]);
};

exports.getSignees = function(city) {
    return Promise.all([
        redis.get(`${city}signees`),
        redis.get('signees')
    ])
        .then(signees => {
            if (city && signees[0]) {
                return JSON.parse(signees[0]);
            }
            else if (!city && signees[1]) {
                return JSON.parse(signees[1]);
            } else {
                let q = "";
                let p = "";
                if (city) {
                    q = "WHERE LOWER(profiles.city) = LOWER($1)";
                    p = [city];
                }
                return db.query(
                    `SELECT users.firstname AS firstname, users.lastname AS lastname, profiles.age AS age, profiles.city AS city, profiles.website AS website
                    FROM signatures
                    LEFT JOIN users
                    ON signatures.user_id = users.id
                    LEFT JOIN profiles
                    ON signatures.user_id = profiles.user_id
                    ${q};`,
                    p
                )
                    .then(userDetails => {
                        if (city) {
                            redis.setex(`${city}signees`, 60*4, JSON.stringify(userDetails));
                            return userDetails;
                        } else {
                            redis.setex('signees', 60*4, JSON.stringify(userDetails));
                            return userDetails;
                        }
                    });
            }
        });
};

exports.hashPassword = function(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        if (plainTextPassword == "") {
            return resolve("");
        }
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
};

exports.checkPassword = function(userInputPassword, userDetails) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(userInputPassword, userDetails.rows[0].password, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve({doesMatch, userDetails});
            }
        });
    });
};

exports.putUserInSession = function(req, userDetails) {
    req.session.user = {};
    req.session.user.id = userDetails.rows[0].id;
    req.session.user.firstname = userDetails.rows[0].firstname;
    req.session.user.lastname = userDetails.rows[0].lastname;
    req.session.user.email = userDetails.rows[0].email;
    req.session.user.age = userDetails.rows[0].age;
    req.session.user.city = userDetails.rows[0].city;
    req.session.user.website = userDetails.rows[0].website;
    req.session.user.sign_id = userDetails.rows[0].sign_id;
};
