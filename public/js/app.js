(function() {

    var socket = io.connect();
    //var activateButton = $("#activate");

    socket.on('laser', function (data) {
        console.log(data);
    });

    var app = angular.module("app", []);
    app.controller("AppCtrl", function($scope, $http) {
        $scope.activated = false;
        socket.on('access', function (data) {
            if (data == "awaiting access"){
                $scope.activated = false;
            } else if (data == "access granted") {
                $scope.activated = true;
            }
            $scope.$apply();
        });
        $scope.activate = function() {
            $http.post("/api/activate");
        };

        $scope.name = "Laser";
    });
})();