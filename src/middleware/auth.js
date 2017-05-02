import moment from 'moment';
import expressJwt from 'express-jwt';
import jwt from 'jsonwebtoken';
import config from '../config';
import db from '../db';



export class AuthController {
    // middleware for logged in users
    requiresLogin(req, res, next) {
        var token = req.param("accessToken");
        if (token) {
            jwt.verify(token, "secret_key", function(err, docs) {
                if (err) {
                    res.json(err);
                } else {
                    var endTime = moment().unix();
                    var loginTime = docs.exp;
                    if (loginTime > endTime) {
                        req.token = docs.token;
                        db.User.find({ where: { id: req.token } })
                            .then(function(user) {
                                req.user = user;
                                next();
                            })
                    }
                }
            })
        } else {
            res.json('User is not logged in');
        }
    }
}

const controller = new AuthController();
export default controller;
