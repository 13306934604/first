

const exp = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cooki = require('cookie-parser');
const fs = require('fs');

const app = exp();

app.use(bodyParser.urlencoded({extended:true}));
//解析cookie对象
app.use(cooki());

//express请求处理管线
//每次请求的多个回调函数构成一个请求处理管线
//管线中的每一个请求都可以得到该请求的数据

function isLogin(req,res,next){
	if(req.cookies.username){
		next();
	}else{
		//跳转页面
		res.redirect('login.html')
	}
}

app.get('/ask.html',isLogin,(req,res,next)=>{
	next();
})

app.get('/answer.html',isLogin,(req,res,next)=>{
	next();
})


//---------------注册-------------
app.post('/user/register',(req,res)=>{
	
	//封装一个写入方法
	function writeFile(){
		var filename = `user/${req.body.username}.txt`;
		fs.exists(filename,(exists)=>{
			if(exists){
				//该用户已经被注册
				res.status(200).json({
					code:1,
					msg:'该用户已经存在'
				})
			}else{
				req.body.ip = req.ip;
				req.body.time = Date.now();
				fs.appendFile(filename,JSON.stringify(req.body),(error)=>{
					if(!error){
						res.status(200).json({
							code:2,
							msg:'注册成功'
						})
					}
				})
			}
		})
	}
	//判断文件夹是否存在
	fs.exists('user',(exists)=>{
		if(exists){
			//写入
			writeFile();
		}else{
			fs.mkdir('user',(error)=>{
				if(error){
					res.status(200).json({
						code:0,
						msg:'用户创建文件失败'
					})
				}else{
					//写入
					writeFile();
				}
			})
		}
	})
})



//-------------登录---------------
app.post('/user/login',(req,res)=>{
	//根据用户名去匹配user文件中的文件
	var filename = `user/${req.body.username}.txt`;
	//判断文件是否存在
	fs.exists(filename,(exists)=>{
		if(exists){
			//该用户注册过,对比密码
			fs.readFile(filename,(error,data)=>{
				if(!error){
					var user = JSON.parse(data);
					if(user.password==req.body.password){
						//将用户名存入cookie
						var expires = new Date();
						expires.setMonth(expires.getMonth()+1);
						res.cookie('username',req.body.username,{expires});
						
						//登录成功
						res.status(200).json({
							code:1,
							msg:'登录成功'
						})
					}else{
						res.status(200).json({
							code:2,
							msg:'密码错误'
						})
					}
				}else{
					res.status(200).json({
						code:3,
						msg:'文件读取失败'
					})
				}
			})
			
		}else{
			res.status(200).json({
				code:0,
				msg:'该用户还未注册'
			})
		}
	})
})



//--------------提问--------------

app.post('/user/ask',(req,res)=>{
	
	//将xss攻击阻止  从内容发起
	var content = req.body.content;
	content=content.replace(/</g,'&lt;');
	content=content.replace(/>/g,'&gt;');
	
	if(req.cookies.username){
		//封装一个写入的函数
		function writerFile(){
			var data = Date.now();
			//文件的名字
			var filename = `question/${Date.now()}.txt`;
			req.body.username = req.cookies.username;
			req.body.time = data;
			req.body.ip = req.ip;
			
			fs.writeFile(filename,JSON.stringify(req.body),(error)=>{
				if(error){
					res.status(200).json({
						code:2,
						msg:'提问失败'
					})
				}else{
					res.status(200).json({
						code:1,
						msg:'提问成功'
					})
				}
			})
		}
		//将获取到的问题存入到question文件夹
		fs.exists('question',(exists)=>{
			if(exists){
				//写入
				writerFile()
			}else{
				fs.mkdir('question',(error)=>{
					if(!error){
						//写入
						writerFile()
					}
				})
			}
		})
	}else{
		res.status(200).json({
			code:0,
			msg:'登录异常，请重新登录'
		})
		return;
	}
})


//-------------退出登录---------------
app.get('/user/out',(req,res)=>{
	res.clearCookie('username');
	res.status(200).json({
		code:1,
		msg:'退出成功'
	})
})




//--------------个人资料----------------

//配置基本信息
var strong = multer.diskStorage({
	//文件名
	destination:'./wwwroot/uploadimg',
	//获取后缀名
	filename:function(req,file,callback){
		console.log(file);
		console.log(file.originalname);
		var fileName = file.originalname.split('.');
		console.log(fileName);
		callback(null,req.cookies.username+'.'+fileName[fileName.length-1]);
	}
})

//创建一个multer对象，根据配置信息来创建
var upload = multer({storage:strong})

app.post('/user/upload',upload.single('file'),(req,res)=>{
	res.status(200).json({
		msg:'图片上传成功'
	})
})




//----------------首页----------------
app.get('/user/all',(req,res)=>{
	fs.readdir('question',(error,files)=>{
		console.log(files);
		if(!error){
			//反序
			files = files.reverse();
			//创建一个数组，将每个读取到文件内容转为一个对象存到这份数组中
			var questions = [];
			
			//第一种方式
//			for(var i=0;i<files.length;i++){
//				var file  =files[i];
//				var filename = 'question/'+file;
//				// readFile 是异步读取文件，不会影响for循环，for循环结束，文件还没有读完
//				//导致数组没有数据。
//				// readFileSync 同步的读取数据，没有回调函数
//				var data = fs.readFileSync(filename);
//				var obj = JSON.parse(data);
//				console.log(obj)
//				questions.push(obj);
//				
//				console.log(questions);
//			}
//               res.status(200).json(questions)
            //第二种方式
            var i = 0;
            function readFile(){
            	if(i<files.length){
            		var file = files[i];
            		var filename = 'question/'+file;
            		fs.readFile(filename,(error,data)=>{
            			if(!error){
            				var obj = JSON.parse(data);
            				questions.push(obj);
            				i++;
            				readFile();
            			}
            		})
            	}else{
            		//代表文件已经读取完毕
            		res.status(200).json(questions);
            	}
            	
            }
            readFile();
		}
	})
})



//---------------回答-----------------

app.post('/user/answer',(req,res)=>{
	//取出question
	var Question = req.cookies.question;
	
	//将xss攻击阻止  从内容发起
	var content = req.body.content;
	content=content.replace(/</g,'&lt;');
	content=content.replace(/>/g,'&gt;');
	
	//根据question找到要回复的是哪个问题
	var filename = 'question/'+Question+'.txt';
	//读取内容
	 fs.readFile(filename,(error,data)=>{
	 	if(!error){
	 		var obj = JSON.parse(data);
	 		if(!obj.answer){
	 			obj.answer=[];
	 		}
	 			//将内容存入进去
	 			req.body.ip = req.ip;
	 			req.body.time = Date.now();
	 			req.body.username = req.cookies.username;

	 		obj.answer.push(req.body);
	 	}
	 	//修改后要重新写入
	 	fs.writeFile(filename,JSON.stringify(obj),(error,data)=>{
	 		if(!error){
	 			res.status(200).json({code:1,msg:'回答成功'})
	 		}else{
	 			res.status(200).json({code:2,msg:'回答失败'})
	 		}
	 	})
	 })
})


app.use(exp.static('wwwroot'));
app.listen(3000,()=>{
	console.log('question服务器开启')
})
