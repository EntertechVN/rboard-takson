module.exports = function (callback) {
    let MongoClient = require('mongodb').MongoClient;
    let url = "mongodb://localhost:27017";

    new JMongo(MongoClient,url).connect(callback);
};

class JMongo{
    constructor(client,url){
        this.client = client;
        this.url = url;
    }

    connect(callback){
        this.client.connect(this.url, function(err, db) {
            if (err) throw err;
            console.log("Database query!!!");
            callback(db.db('rtboard'));
            db.close();
        });
    }
}