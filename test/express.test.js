"use strict";

var request = require("supertest-as-promised"),
    testutil = require("./testutil"),
    app = testutil.getApp();

describe('Core express tests', function(){

    it("checks for a homepage", function(){
        return request(app)
            .get("/")
            .expect(200);
    });

    it("checks that errors are handled", function(){
        return request(app)
            .get("/mock500")
            .expect(500);
    });

    it("checks that 404s are handled", function(){
        return request(app)
            .get("/mock404")
            .expect(404);
    });

    it("checks that 404s are handled on the api", function(){
        return request(app)
            .get("/api/mock404")
            .expect(404);
    });

    it("checks that 500s are handled on the api", function(){
        return request(app)
            .get("/api/mock500")
            .expect(500);
    });

});