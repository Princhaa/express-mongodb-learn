var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var fs = require('fs');
var multer = require('multer');

var app = express();
var apiRoutes = express.Router();

var config = require('./config');
var User = require('./app/models/user');
var Post = require('./app/models/posts');
var Comment = require('./app/models/comment');
var Message = require('./app/models/message');

var port = process.env.PORT || 8080;
const SALT_WORK_FACTOR = 10;

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'img/user_picture');
    },
    filename: function(req, file, cb) {
        cb(null, req.user.username+'.jpg');
    }
})

var upload = multer({ storage: storage })

mongoose.connect(config.database);
app.set('superSecret', config.secret);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    if (req.method === 'OPTIONS') {
        res.header("Access-Control-Allow-Methods", "PUT, POST, DELETE");
        return res.status(200).json({});
    }

    next();
});
app.use('/static', express.static('img'));

app.get('/setup', function (req, res) {
    //create a sample user
    var shuka = new User({
        username: 'shukashuu',
        password: 'shukashuu',
        admin: true,
        firstname: 'Saitou',
        lastname: 'Shuka',
        email: 'shukashuu@gmail.com'
    });

    shuka.save(function (err) {
        if (err) throw err;

        console.log('User saved successfully');
        res.json({ success: true });
    });
});

apiRoutes.post('/change', function (req, res) {
    Post.findOneAndUpdate({ _id: '592cd7ac068496300dcfe3e5' }, { 
        $set: { 
            price: 400000 
        } 
    }, function (err, post) {
        res.json(post);
    })
})

apiRoutes.get('/post-list', function (req, res) {
    Post.find({})
        .populate('_creator').exec(function (err, post) {
            if (err) throw err;
            return res.json(post);
        });
})

apiRoutes.get('/delete-post', function (req, res) {
    Post.findOneAndRemove({ _id: '592cf2b24262133313d562df' }, function (err, post) {
        res.json(post);
    })
})

apiRoutes.get('/users', function (req, res) {
    User.find({}, function (err, users) {
        res.json(users);
    });
});

apiRoutes.post('/check-username', function (req, res) {
    User.findOne({
        username: req.body.username
    }, function (err, user) {
        console.log(user);
        if (user) {
            res.json({ status: 'unavailable' })
        } else {
            res.json({ status: 'available' })
        }
    })
})

apiRoutes.post('/register', function (req, res) {
    var newUser = new User({
        username: req.body.username,
        password: req.body.password,
        admin: false,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email
    });
    console.log(req.body);

    newUser.save(function (err) {
        if (err) throw err;

        console.log('User saved successfully');
        res.json({ success: true })
    })
})

apiRoutes.post('/post-detail', function (req, res) {
    Post.findOne({
        _id: req.body._id
    }).populate('_creator').exec(function (err, post) {
        res.json(post);
    })
})

apiRoutes.post('/authenticate', function (req, res) {
    User.findOne({
        username: req.body.username
    }, function (err, user) {
        console.log(user);
        if (!user) {
            res.json({ success: false, message: 'Authentication failed. User not found.' });
        } else if (user) {
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (err) console.log(err);
                if (isMatch) {
                    var token = jwt.sign(user, app.get('superSecret'), {
                        expiresIn: 60 * 60 * 24
                    });
                    res.json({
                        success: true,
                        message: 'Enjoy your token!',
                        token: token,
                        id: user._id
                    });
                } else {
                    res.json({ success: false, message: 'Authentication failed. Wrong password' });
                }
            });
        }
    });
});

//user info will be stored in the req.user
apiRoutes.use(function (req, res, next) {
    var token = req.body.token || req.query.token || req.header('Authorization');
    if (token) {
        jwt.verify(token, app.get('superSecret'), function (err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token' });
            } else {
                req.user = decoded._doc;
                next();
            }
        });
    } else {
        return res.status(403).json({
            success: false,
            message: 'No token provided'
        });
    }
})

apiRoutes.get('/my-profile', function (req, res) {
    res.json(req.user);
})

apiRoutes.post('/update-profile', function (req, res) {
    if (req.body.password) {
        //generate salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
            if (err) return next(err);
            console.log('gen salt');
            //hash the password
            bcrypt.hash(req.body.password, salt, function (err, hash) {
                if (err) return next(err);
                req.body.password = hash;
                console.log(req.body.password);
                User.findOneAndUpdate({ _id: req.user._id }, {
                    $set: {
                        firstname: req.body.firstname,
                        lastname: req.body.lastname,
                        email: req.body.email,
                        password: req.body.password,
                        username: req.body.username
                    }
                }, function (err, user) {
                    res.json(user);
                });
            });
        });
    } else {
        User.findOneAndUpdate({ _id: req.user._id }, {
            $set: {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                username: req.body.username
            }
        }, function (err, user) {
            res.json(user);
        });
    }
})

apiRoutes.post('/new-post', function (req, res) {
    var post = new Post({
        _creator: req.user._id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        price: req.body.price,
        sold: false
    });

    post.save(function (err) {
        if (err) throw err;
        console.log('Post saved successfully');
        res.json({ success: true })
    })
})

apiRoutes.post('/post-new-comment', function (req, res) {
    Post.findOne({
        _id: req.body._id
    }, function (err, post) {
        var comment = new Comment({
            content: req.body.content,
            _inPost: post._id,
            _creator: req.user._id
        });

        comment.save(function (err) {
            if (err) throw err;

            console.log('Comment saved successfully!');
            res.json({ success: true })
        })
    })
})

apiRoutes.post('/get-post-comments', function (req, res) {
    Post.findOne({
        _id: req.body._id
    }, function (err, post) {
        Comment.find({
            _inPost: post._id
        }, function (err, comments) {
            if (err) throw err;
            res.json(comments);
        })
    })
})

apiRoutes.post('/new-message', function (req, res) {
    var message = new Message({
        _sender: req.user._id,
        _receiver: req.body._receiver,
        message: req.body.message
    });

    message.save(function (err) {
        if (err) throw err;

        console.log('Message saved successfully!');
        res.json({ success: true })
    })
})

apiRoutes.get('/get-messages', function (req, res) {
    Message.find({
        _receiver: req.user._id
    }).populate('_sender').exec(function (err, messages) {
        res.json(messages);
    })
})

apiRoutes.post('/change-profile-picture', upload.single('avatar'), function (req, res) {
    console.log(req.user);
    User.findOneAndUpdate({ username: req.user.username }, {
        $set: {
            picture: `/img/${req.user.username}.jpg`
        }
    }, function (err, user) {
        if (err) throw err;
        res.json(user);
    })
})

apiRoutes.post('/delete-user', function (req, res) {
    User.findOneAndRemove({ _id: req.body.id }, function(err, user) {
        if (err) throw err;
        res.json({ success: true });
    })
})

apiRoutes.get('/', function (req, res) {
    res.json({ message: 'Welcome to the coolest API on earth!' });
});

app.get('/', function (req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

app.use('/api', apiRoutes);
app.listen(port);
console.log('Magic happens at http://localhost:' + port);