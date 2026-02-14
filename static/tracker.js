(function() {
  "use strict";
  var s = document.currentScript;
  if (!s) return;

  var projectId = s.dataset.project;
  var endpoint = s.dataset.endpoint;
  if (!projectId || !endpoint) return;

  var sessionId = sessionStorage.getItem("_sp_sid");
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_sp_sid", sessionId);
  }

  var startTime = Date.now();
  var maxScroll = 0;

  function getScrollDepth() {
    var h = document.documentElement;
    var scrollTop = window.scrollY || h.scrollTop;
    var scrollHeight = h.scrollHeight - h.clientHeight;
    if (scrollHeight <= 0) return 100;
    return Math.round((scrollTop / scrollHeight) * 100);
  }

  window.addEventListener("scroll", function() {
    var depth = getScrollDepth();
    if (depth > maxScroll) maxScroll = depth;
  }, { passive: true });

  function send(path, extra) {
    var data = {
      projectId: projectId,
      sessionId: sessionId,
      path: path,
      referrer: document.referrer || null,
      screenWidth: window.innerWidth
    };
    if (extra) {
      for (var k in extra) data[k] = extra[k];
    }
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(data));
    }
  }

  // Track page view
  function trackView() {
    startTime = Date.now();
    maxScroll = 0;
    send(location.pathname);
  }

  // Track leave — send duration and scroll depth
  function trackLeave() {
    var duration = Math.round((Date.now() - startTime) / 1000);
    send(location.pathname, { duration: duration, scrollDepth: maxScroll });
  }

  // Initial page view
  trackView();

  // Send on page hide (works for tab close, navigation, etc.)
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "hidden") trackLeave();
  });

  // SPA navigation — intercept pushState/replaceState
  var origPush = history.pushState;
  var origReplace = history.replaceState;

  history.pushState = function() {
    trackLeave();
    origPush.apply(this, arguments);
    trackView();
  };

  history.replaceState = function() {
    origReplace.apply(this, arguments);
  };

  window.addEventListener("popstate", function() {
    trackLeave();
    trackView();
  });
})();
