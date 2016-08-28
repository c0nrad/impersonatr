var app = angular.module('app', []);

app.controller('HomeController', function($scope, State) {
  chrome.tabs.query({active:true, currentWindow: true}, function(tabs) {
    $scope.origin = getOrigin(tabs[0].url);
    $scope.states = State.getAll($scope.origin);
    $scope.$apply(function($scope) {});
  });

  $scope.openInTab = function(url) {
    chrome.tabs.create({ url: url });
  }

  $scope.saveState = function(link) {
    getCookies($scope.origin, function(cookies) {
      State.save($scope.origin, cookies);
      $scope.states = State.getAll($scope.origin);
      $scope.$apply(function($scope) {});      
    })
  }

  $scope.clearSession = function() {
    getCookies($scope.origin, function(cookies) {
      for (var i = 0; i < cookies.length; i++) {
        chrome.cookies.remove({url: $scope.origin, name: cookies[i].name})
      }

      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          chrome.tabs.reload(tabs[0].id);
      });
    })
  }

  $scope.updateState = function(state) { //id, newName
    delete state.editMode

    State.update($scope.origin, state)
    $scope.states = State.getAll($scope.origin);
  }

  $scope.deleteState = function() { // id
    State.remove($scope.origin, $scope.states[0])
    $scope.states = State.getAll($scope.origin);
  }

  $scope.loadState = function(state) { // id
    if (state.editMode === true) {
      return
    }

    for (var i = 0; i < state.cookies.length; i++) {
      var cookie = angular.copy(state.cookies[i]);
      cookie.url = $scope.origin
      delete cookie.hostOnly;
      delete cookie.session;
      chrome.cookies.set(cookie);
    } 

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.reload(tabs[0].id);
    });
   
  }
});

app.service('State', function () {
  function getAll(origin) {
    var previous = localStorage[origin]
    if (!previous || previous.length == 0) {
      return []
    }
    return JSON.parse(previous);
  }

  this.getAll = getAll;
  this.save = function(origin, cookies) { 
    var previous = getAll(origin);
    var state = {
      id: uuid.v4(),
      ts: Date.now() / 1000 | 0,
      name: "Session " + previous.length,
      cookies: cookies,
      origin: origin
    }

    if (previous.length == 0) {
      localStorage[origin] = JSON.stringify([state])
    } else {
      previous.push(state)
      localStorage[origin] = JSON.stringify(previous) 
    }
  };

  this.update = function(origin, newState) {
    var previous = getAll(origin);

    for (var i = 0; i < previous.length; i++) {
      var state = previous[i];
      if (state.id === newState.id) {
        previous[i] = newState
      }
    }

    localStorage[origin] = JSON.stringify(previous) 
  }

  this.remove = function(origin, oldState) {
    var previous = getAll(origin);

    for (var i = 0; i < previous.length; i++) {
      var state = previous[i];
      if (state.id === oldState.id) {
        previous.splice(i, 1);
      }
    }
    localStorage[origin] = JSON.stringify(previous) 
  }
});

function getOrigin(url) {
  var u = new URL(url);
  return u.origin
}

function getCookies(origin, next) {
  chrome.cookies.getAll({url: origin}, function(cookies) {
    next(cookies);
  });
}
