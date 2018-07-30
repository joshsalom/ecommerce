const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressSession = require('express-session');
const config = require('./config');

const indexRouter = require('./app/routes/index');

const app = express();

//MongoDB setup
const mongo = require('mongodb');
const monk = require('monk');
const url = config.mongodb_url;
const db = monk(url);

var port = process.env.PORT || 3000;

// express session to save session data
app.use(expressSession({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

//Make the database accessible to the router.
app.use(function(req, res, next) {
    req.db = db;
    console.log(req.session.currentUserObj);
    next();
});

// view engine setup
app.set('views', path.join(__dirname, 'app', 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

app.listen(port, function () {
  console.log('Server running at localhost:' + port)
});

module.exports = app;
