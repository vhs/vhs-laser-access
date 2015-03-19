"use strict";

var testutil = require("./testutil"),
    slack = require("../slack");

describe("Slack API client", function(){

    before(function(){
        testutil.stubSlack();
    });

    after(function(){
        testutil.restoreSlackStub();
    });

    it("tries users for group", function(){
        return slack.usersForGroup("token", "GROUP_ID_2")
            .then(function(groups){
                groups.should.have.length(2);
                groups.should.contain("CREATOR_ID");
                groups.should.contain("MEMBER_ID_2");
            })
    });

    it("tries users for an invalid group", function(){
        return slack.usersForGroup("token", "GROUP_INVALID")
            .then(function(groups){
                groups.should.have.length(0);
            });
    });

});

