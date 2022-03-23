//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require("mongoose-findorcreate");

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret:"thisisasecretforthelvl5",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://shubham:Shubham%4019@cluster0.gdayu.mongodb.net/blogDB?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const postSchema = {
  title: String,
  content: String
};

const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  blogs:[postSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Post = mongoose.model("Post",postSchema);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
  done(null,user.id);
});
passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
      done(err,user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/personal-blog",
  userProfileURL:"https://www.googlepis.com/oauth2/v3/userinfo",
  passReqToCallback: true
},
function(request, accessToken, refreshToken, profile, done) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return done(err, user);
  });
}
));

app.get("/", function(req, res){
    if(req.isAuthenticated()){
      User.findById(req.user.id,function(err,foundUser){
    if(err){
      res.render("login");
    }else{res.render("home", {
    startingContent: homeStartingContent,
    posts: foundUser.blogs
    });}
  });
}else{
    res.redirect("/login");
  }
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.get("/login",function(req,res){
  res.render("login",{method:"login",antimethod:"signUp"});
});

app.get("/signUp",function(req,res){
  res.render("login",{method:"signUp",antimethod:"login"});
});

app.get("/compose", function(req, res){
  if(req.isAuthenticated()){
    res.render("compose");
}else{
    res.redirect("/login");
}
});


app.post("/compose", function(req, res){
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody
  });
  post.save();
  User.findById(req.user.id,function(err,foundUser){
    foundUser.blogs.push(post);
    foundUser.save(function(err){
      if (!err){
        res.redirect("/");
      }
    });
  });
});

app.get("/posts/:postId", function(req, res){
  const requestedPostId = req.params.postId;

  Post.findOne({_id:requestedPostId},function(err,foundPost){
    res.render("post", {
      title: foundPost.title,
      content: foundPost.content
    });
  }); 
});


app.get("/auth/google",
  passport.authenticate("google", { scope:["profile"] }
));

app.get("/auth/google/personal-blog",
    passport.authenticate("google",{failureRedirect:"/login",successRedirect:"/"}
));

app.post("/signUp",function(req,res){
    User.register({username:req.body.username}, req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/signUp");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/");
            });
        }
    })
});

app.post("/login",function(req,res){
    const newUser = new User({
        email:req.body.username,
        password:req.body.password
    });

    req.login(newUser,function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/");
            });
        }
    });
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});
