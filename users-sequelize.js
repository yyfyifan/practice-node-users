const Sequenlize = require('sequelize');
const jsyaml = require('js-yaml');
const fs = require('fs').promises;
const util = require('util');
const DBG = require('debug');
const { Sequelize } = require('sequelize');

const log = DBG("users:model-users");
const error = DBG("users:error");


let connection;

class SQUser extends Sequenlize.Model {

}

const connectDB = async () => {
    if (connection) {
        return connection;
    }

    // 从指定环境变量的地址读取数据
    const yamlText = await fs.readFile(process.env.SEQUELIZE_CONNECT, 'utf8');
    const params = await jsyaml.safeLoad(yamlText, 'utf8');
    // 允许从环境变了来重写配置信息
    if (typeof process.env.SEQUELIZE_DBNAME !== 'undefined'
        && process.env.SEQUELIZE_DBNAME !== '') {
        params.dbname = process.env.SEQUELIZE_DBNAME;
    }
    if (typeof process.env.SEQUELIZE_DBUSER !== 'undefined'
        && process.env.SEQUELIZE_DBUSER !== '') {
        params.username = process.env.SEQUELIZE_DBUSER;
    }
    if (typeof process.env.SEQUELIZE_DBPASSWD !== 'undefined'
        && process.env.SEQUELIZE_DBPASSWD !== '') {
        params.password = process.env.SEQUELIZE_DBPASSWD;
    }
    if (typeof process.env.SEQUELIZE_DBHOST !== 'undefined'
        && process.env.SEQUELIZE_DBHOST !== '') {
        params.params.host = process.env.SEQUELIZE_DBHOST;
    }
    if (typeof process.env.SEQUELIZE_DBPORT !== 'undefined'
        && process.env.SEQUELIZE_DBPORT !== '') {
        params.params.port = process.env.SEQUELIZE_DBPORT;
    }
    if (typeof process.env.SEQUELIZE_DBDIALECT !== 'undefined'
        && process.env.SEQUELIZE_DBDIALECT !== '') {
        params.params.dialect = process.env.SEQUELIZE_DBDIALECT;
    }
    log('Sequelize params ' + util.inspect(params));

    // 建立连接
    connection = new Sequenlize(params.dbname, params.username, params.password, params.params);

    // 创建数据库schema
    SQUser.init({
        username: {
            type: Sequelize.STRING,
            unique: true
        },
        password: Sequelize.STRING,
        provider: Sequelize.STRING,
        familyName: Sequelize.STRING,
        givenName: Sequelize.STRING,
        middleName: Sequelize.STRING,
        emails: Sequelize.STRING(2048),
        photos: Sequelize.STRING(2048),
    }, {
        sequelize: connection,
        modelName: "SQUser"
    });

    // 同步schema到数据库
    await SQUser.sync();
};

// helper function. Retrieve the data from request
const userParams = (req) => {
    return {
        username: req.params.username,
        password: req.params.password,
        provider: req.params.provider,
        familyName: req.params.familyName,
        givenName: req.params.givenName,
        middleName: req.params.middleName,
        emails: JSON.stringify(req.params.emails),
        photos: JSON.stringify(req.params.photos)
    };
}
// 只保留我们需要的字段，将sequelize给我们的其他字段剔除
const sanitizedUser = user => {
    let ret = {
        id: user.username,
        username: user.username,
        provider: user.provider,
        familyName: user.familyName,
        givenName: user.givenName,
        middleName: user.middleName
    };
    try {
        ret.emails = JSON.parse(user.emails)
    } catch (e) {
        ret.emails = []
    }
    try {
        ret.photos = JSON.parse(user.photos);
    } catch (e) {
        ret.photos = []
    }
    return ret;
}

const findOneUser = async (username) => {
    let user = await SQUser.findOne({where: {username: username}});
    // 返回一个匿名类型对象
    user = user ? sanitizedUser(user) : undefined;
    return user;
}

const createUser = async (req) => {
    let tocreate = userParams(req);
    await SQUser.create(tocreate);
    const result = await findOneUser(req.params.username);
    return result;
}


module.exports = {
    SQUser,
    connectDB,
    userParams,
    sanitizedUser,
    findOneUser,
    createUser
}