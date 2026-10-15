require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const exphbs = require('express-handlebars');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const axios = require('axios').default;
const Handlebars =  require('handlebars');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');
const socketAudioQueue = require('./configs/audioQueueConfig').initSocketIO;

//Initialize App
let app = express();
let server = require('http').createServer(app);
let io = socketAudioQueue(server);

app.set('io', io);

app.use(bodyParser.urlencoded({parameterLimit: 100000, limit: '50mb', extended: true}));

app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// passport.use(new LocalStrategy({
//         usernameField: 'email',
//         passwordField: 'password'
//     },
//     async (email, password, done) => {
//         try {

//             const rows = await mySQLScripts.getUserByEmail(email)
//             if (rows.length === 0) {
//                 console.log('no user')
//                 return done(null, false, { message: 'Email does not exist.' });
//             }

//             const user = rows[0];
//             console.log(user);
//             // Compare the provided password with the password stored in the database
//             if (password !== user.password) {
//                 console.log('pass wrong')
//                 return done(null, false, { message: 'Incorrect password.' });
//             }

//             // If both username and password are correct, return the user
//             return done(null, user);
//         } catch (error) {
//             return done(error);
//         }
//     }
// ));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
    try {
        // Query the database to find the user by ID
        const rows = await mySQLScripts.getUserById(id)

        // Check if the user exists
        if (rows.length === 0) {
            return done(null, false);
        }

        const user = rows[0];
        return done(null, user);
    } catch (error) {
        return done(error);
    }
});

app.use(express.json({type: 'application/json', parameterLimit: 100000, limit: '50mb', extended: true}));
app.use(cookieParser());
let routes = require('./routes/index');

//View Engine
app.set('views', path.join(__dirname, 'views') );
app.set('view engine', 'handlebars');

app.engine('handlebars', exphbs({
    defaultLayout: 'layout.handlebars',
    partialsDir: path.join(__dirname, 'views/partials'),
    extname: 'handlebars',
    handlebars: allowInsecurePrototypeAccess(Handlebars),
    helpers: {
        ifCond: function (v1, v2, options) {
            if (v1 === v2) {
                return options.fn(this);
              }
              return options.inverse(this);
            },
        bar: function () { return 'BAR!'; },
        json: function(obj) {
            return JSON.stringify(obj);
        },
        underScore: function(v1) {
            return v1.replaceAll(' ', '_')
        }
    }
}));

//set static public folder
app.use(express.static(path.join(__dirname, 'assets')));
//Connect Flash
app.use(flash(app));

app.use('/', routes);

const PORT = process.env.PORT || 8080;

app.set('port', (PORT));

server.listen(PORT, function() {
    console.log('VoiceRipper|Local-Port:', PORT, `Environment|${process.env.NODE_ENV}`);
})