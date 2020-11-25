// a RESTful server to manage users

const restify = require('restify');
const util = require('util');
const logger = require('morgan');
const { SQUser,
    connectDB,
    userParams,
    sanitizedUser,
    findOneUser,
    createUser } = require('./users-sequelize');

const DBG = require('debug');
const log = DBG("users:service");
const error = DBG("users:error");

const apiKey = [{ user: "them", key: "D4ED43C0-8BD6-4FE2-B358-7C0E230D11EF" }];

// 自定义的中间件，检查request中是否 有验证的user+key
const check = (req, res, next) => {
    if (req.authorization && req.authorization.basic) {
        let found = false;
        for (let auth of apiKey) {
            if (auth.key === req.authorization.basic.password
                && auth.user === req.authorization.basic.username) {
                found = true;
                break;
            }
        }
        if (found) {
            next();
        }
        else {
            res.send(401, new Error("Not Authenticated"));
            next(false);
        }
    } else {
        res.send(500, new Error("Not Authorization Key"));
        next(false);
    }

}

// 创建REST server
const server = restify.createServer({
    name: "User-Auth-Service",
    version: "0.0.1"
});

// 
server.use(logger('dev'));
server.use(restify.plugins.authorizationParser());
// server.use(check);  // 在通过第一个中间件处理后检查是否验证成功
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({
    mapParams: true
}));


server.listen(process.env.PORT, "localhost", function () {
    log(server.name + ' listening at ' + server.url);
});

process.on("uncaughtException", err => {
    console.error("UNCAUGHT EXCEPTION" + (err.stack || err));
    process.exit(1);
})

process.on("unhandledRejection", (reason, p) => {
    console.error(`UNHANDLED PROMISE REJECTION: ${util.inspect(p)} reason: ${reason}`);
    process.exit(1);
});

server.post("/create-user", async (req, res, next) => {
    try {
        await connectDB();
        let result = await createUser(req);
        res.contentType = "json";
        res.send(result);
        log("创建成功!!");
        next(false);
    } catch (err) {
        error(err);
        res.send(500, err);
        next(false);
    }
})

server.post("/find-or-create", async (req, res, next) => {
    try {
        await connectDB();
        let user = await findOneUser(req.params.username);
        if (!user) {
            user = await createUser(req);
            if (!user) throw new Error("No user created");
        }
        res.contentType = "json";
        res.send(user);
        return next(false);
    } catch (err) {
        res.send(500, err);
        next(false);
    }
})

server.get("/find/:username", async (req, res, next) => {
    try {
        await connectDB();
        const user = await findOneUser(req.params.username);
        if (!user) {
            res.send(404, new Error("Did not find " + req.params.username));
        } else {
            res.contentType = "json";
            res.send(user);
        }
        next(false);
    } catch (err) {
        res.send(500, err);
        next(false);
    }
});

server.get("/list", async (req, res, next) => {
    try {
        await connectDB();
        let userlist = await SQUser.findAll({});
        userlist = userlist.map(user => sanitizedUser(user));
        if (!userlist) {
            userlist = [];
        }
        res.contentType = "json";
        res.send(userlist);
        next(false);
    } catch (err) {
        res.send(500, err);
        next(false);
    }
});

server.post("/update-user/:username", async (req, res, next) => {
    try {
        await connectDB();
        let toupdate = userParams(req);
        await SQUser.update(toupdate, {
            where: {
                username: req.params.username
            }
        });
        const result = await findOneUser(req.params.username);
        res.contentType = "json";
        res.send(result);
        next(false);
    } catch (err) {
        res.send(500, err);
        next(false);
    }
});

server.del("/destroy/:username", async (req, res, next) => {
    try {
        await connectDB();
        const user = await SQUser.findOne({
            where: {
                username: req.params.username
            }
        });
        if (!user) {
            res.send(404, new Error("Did not find this user to delete"));
        } else {
            user.destroy(); // 删除
            res.contentType = "json";
            res.send({});
        }
        next(false);
    } catch (err) {
        res.send(500, err);
        next(false);
    }
})

server.post("/password-check", async (req, res, next) => {
    try {
        await connectDB();
        const user = await SQUser.findOne({
            where: {
                username: req.params.username
            }
        });
        let checked;
        if (!user) {
            checked = {
                check: false,
                username: req.params.username,
                message: "Could not find user"
            };
        } else if (user.username === req.params.username && user.password === req.params.password) {
            checked = {
                check: true,
                username: user.username
            }
        } else {
            checked = {
                check: false,
                username: req.params.username,
                message: "Incorrect password"
            };
        }
        res.contentType = "json";
        log(util.inspect(checked));
        res.send(checked);
        next(false);
    } catch (err) {
        res.send(500, err);
        next(false);
    }
})