const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const moment = require("moment");
const momentTimezone = require("moment-timezone");

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const multer  = require('multer');

const app = express();
const port = process.env.PORT || 5000;

app.set("view engine","ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({secret : 'secret', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

MongoClient.connect("mongodb+srv://admin:qwer1234@testdb.g2xxxrk.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("portfolio02");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});


//  /loginresult 경로 요청시 passport.autenticate() 함수구간이 아이디 비번 로그인 검증구간
passport.use(new LocalStrategy({
    usernameField: 'adminId',
    passwordField: 'adminPass',
    session: true,
    passReqToCallback: false,
  }, function (id, pass, done) {
    // console.log(userid, userpass);
    db.collection('user').findOne({ adminId: id }, function (err, result) {
      if (err) return done(err)
  
      if (!result) return done(null, false, { message: '존재하지않는 아이디 입니다.' })
      if (pass == result.adminPass) {
        return done(null, result)
      } else {
        return done(null, false, { message: '비번이 틀렸습니다' })
      }
    })
  }));

    //처음 로그인 했을 시 해당 사용자의 아이디를 기반으로 세션을 생성함
  //  req.user
  passport.serializeUser(function (user, done) {
    done(null, user.adminId) //서버에다가 세션만들어줘 -> 사용자 웹브라우저에서는 쿠키를 만들어줘
  });
  
  // 로그인을 한 후 다른 페이지들을 접근할 시 생성된 세션에 있는 회원정보 데이터를 보내주는 처리
  // 그전에 데이터베이스 있는 아이디와 세션에 있는 회원정보중에 아이디랑 매칭되는지 찾아주는 작업
  passport.deserializeUser(function (adminId, done) {
      db.collection('user').findOne({adminId:adminId }, function (err,result) {
        done(null, result);
      })
  }); 


//파일첨부

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/upload')
    },
    filename : function(req, file, cb){
        cb(null, file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8') )
      }
    })
const upload = multer({ storage: storage })



// 관리자가 보는 페이지
// 관리자 화면 로그인 페이지
app.get("/admin",(req,res) => {
    res.render("admin_login");
});

// 관리자 화면 로그인 유무 확인
app.post("/login",passport.authenticate('local', {failureRedirect : '/fail'}),(req,res) => {
    // 로그인 성공시 상품 등록 페이지로 이동
    res.redirect("/admin/prdlist");
});

// 로그인 실패시 fail 경로
app.get("/fail",(req,res) => {
    res.send("로그인 실패");
});

// 관리자 상품 등록 페이지
app.get("/admin/prdlist",(req,res) => {
    // db에 저장되어있는 상품 목록들 find로 찾아와서 전달
    db.collection("prdlist").find({}).toArray((err,result) => {
      res.render("admin_prdlist",{prdData:result, userData:req.user})
    });
});

// 상품을 db에 넣는 경로
app.post("/add/prdlist",upload.single('thumbnail'),(req,res) => {
    if(req.file) {
      fileTest = req.file.originalname;
    }
    else {
      fileTest = null;
    }
    db.collection("count").findOne({name:"상품등록"},(err,result1)=> {
      db.collection("prdlist").insertOne ({
        num:result1.prdCount + 1,
        name:req.body.name,
        thumbnail:fileTest,
        category:req.body.category
      },(err,result) => {
        db.collection("count").updateOne({name:"상품등록"},{$inc:{prdCount:1}},(err,result)=>{
          // 상품 등록페이지로 다시 이동
          res.redirect("/admin/prdlist");
        });
      });
    });
});



// 관리자 매장등록 페이지 경로
app.get("/admin/storelist",(req,res) => {
  // db에 들어있는 모든매장 리스트 다 보여줌
  db.collection("storelist").find({}).toArray((err,result) => {
    res.render("admin_store",{storeData:result, userData:req.user});
  });
});

// 매장등록페이지 에서 전송한 값 데이터베이스에 삽입
app.post("/addstore",(req,res) => {
  db.collection("count").findOne({name:"매장등록"},(err,result1)=> {
    db.collection("storelist").insertOne ({
      num:result1.storeCount + 1,
      name:req.body.name,
      sido:req.body.city1,
      sigugun:req.body.city2,
      address:req.body.detail,
      phone:req.body.phone
    },(err,result) => {
      db.collection("count").updateOne({name:"매장등록"},{$inc:{storeCount:1}},(err,result)=>{
        // 상품 등록페이지로 다시 이동
        res.redirect("/admin/storelist");
      });
    });
  });
});





// 사용자가 보는 페이지
// 커피메뉴 페이지
app.get("/menu/coffee",(req,res)=> {
  db.collection("prdlist").find({category:"커피"}).toArray((err,result) => {
    res.render("menu",{prdData:result});
  });
});

// 쿠키메뉴 페이지
app.get("/menu/cookie",(req,res)=> {
  db.collection("prdlist").find({category:"쿠키"}).toArray((err,result) => {
    res.render("menu",{prdData:result});
  });
});

// 매장 검색 페이지
app.get("/store",(req,res) => {
  db.collection("storelist").find({}).toArray((err,result) => {
    res.render("store",{storeData:result});
  });
});

// 매장 지역검색 경과화면 페이지
app.get("/search/local",(req,res) => {
  // 시/도 선택시
  // form태그에서 post로 썼을 때 →  req.body.name   /   form태그에서 get으로 썼을 때 →  req.query.name
  if(req.query.city1 !== "" && req.query.city2 === ""){
    db.collection("storelist").find({sido:req.query.city1}).toArray((err,result) => {
      res.render("store",{storeData:result});
    });
  }
  // 시/도 구/군 선택시
  else if (req.query.city1 !== "" && req.query.city2 !== ""){
    db.collection("storelist").find({sido:req.query.city1, sigugun:req.query.city2}).toArray((err,result) => {
      res.render("store",{storeData:result});
    });
  }
  // 아무것도 선택하지 않았을때
  else {
    res.redirect("/store");
  }
});

app.get("/search/storename",(req,res) => {
  
  // query:   ←   store.ejs 파일에서 입력한 input text의 값 (req.query.name)
  // path:    ←   db storelist 컬렉션에서 어떤 항목명으로 찾을것인지 name
  let storeSearch = [
    {
      $search: {
        index: 'store_search',
        text: {
          query: req.query.name,
          path: "name"
        }
      }
    }
  ]

  // 검색어 입력시
  if (req.query.name !== "") {
    db.collection("storelist").aggregate(storeSearch).toArray((err,result) => {
      res.render("store",{storeData:result});
    });
  }
  // 검색어 미입력시
  else {
    res.redirect("/store");
  }
});