(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (factory());
}(this, (function () { 'use strict';

  /**
   * https://github.com/WICG/focus-visible
   */
  function init() {
    var hadKeyboardEvent = true;
    var hadFocusVisibleRecently = false;
    var hadFocusVisibleRecentlyTimeout = null;

    var inputTypesWhitelist = {
      text: true,
      search: true,
      url: true,
      tel: true,
      email: true,
      password: true,
      number: true,
      date: true,
      month: true,
      week: true,
      time: true,
      datetime: true,
      'datetime-local': true
    };

    /**
     * Helper function for legacy browsers and iframes which sometimes focus
     * elements like document, body, and non-interactive SVG.
     * @param {Element} el
     */
    function isValidFocusTarget(el) {
      if (
        el &&
        el !== document &&
        el.nodeName !== 'HTML' &&
        el.nodeName !== 'BODY' &&
        'classList' in el &&
        'contains' in el.classList
      ) {
        return true;
      }
      return false;
    }

    /**
     * Computes whether the given element should automatically trigger the
     * `focus-visible` class being added, i.e. whether it should always match
     * `:focus-visible` when focused.
     * @param {Element} el
     * @return {boolean}
     */
    function focusTriggersKeyboardModality(el) {
      var type = el.type;
      var tagName = el.tagName;

      if (tagName == 'INPUT' && inputTypesWhitelist[type] && !el.readOnly) {
        return true;
      }

      if (tagName == 'TEXTAREA' && !el.readOnly) {
        return true;
      }

      if (el.isContentEditable) {
        return true;
      }

      return false;
    }

    /**
     * Add the `focus-visible` class to the given element if it was not added by
     * the author.
     * @param {Element} el
     */
    function addFocusVisibleClass(el) {
      if (el.classList.contains('focus-visible')) {
        return;
      }
      el.classList.add('focus-visible');
      el.setAttribute('data-focus-visible-added', '');
    }

    /**
     * Remove the `focus-visible` class from the given element if it was not
     * originally added by the author.
     * @param {Element} el
     */
    function removeFocusVisibleClass(el) {
      if (!el.hasAttribute('data-focus-visible-added')) {
        return;
      }
      el.classList.remove('focus-visible');
      el.removeAttribute('data-focus-visible-added');
    }

    /**
     * Treat `keydown` as a signal that the user is in keyboard modality.
     * Apply `focus-visible` to any current active element and keep track
     * of our keyboard modality state with `hadKeyboardEvent`.
     * @param {Event} e
     */
    function onKeyDown(e) {
      if (isValidFocusTarget(document.activeElement)) {
        addFocusVisibleClass(document.activeElement);
      }

      hadKeyboardEvent = true;
    }

    /**
     * If at any point a user clicks with a pointing device, ensure that we change
     * the modality away from keyboard.
     * This avoids the situation where a user presses a key on an already focused
     * element, and then clicks on a different element, focusing it with a
     * pointing device, while we still think we're in keyboard modality.
     * @param {Event} e
     */
    function onPointerDown(e) {
      hadKeyboardEvent = false;
    }

    /**
     * On `focus`, add the `focus-visible` class to the target if:
     * - the target received focus as a result of keyboard navigation, or
     * - the event target is an element that will likely require interaction
     *   via the keyboard (e.g. a text box)
     * @param {Event} e
     */
    function onFocus(e) {
      // Prevent IE from focusing the document or HTML element.
      if (!isValidFocusTarget(e.target)) {
        return;
      }

      if (hadKeyboardEvent || focusTriggersKeyboardModality(e.target)) {
        addFocusVisibleClass(e.target);
      }
    }

    /**
     * On `blur`, remove the `focus-visible` class from the target.
     * @param {Event} e
     */
    function onBlur(e) {
      if (!isValidFocusTarget(e.target)) {
        return;
      }

      if (
        e.target.classList.contains('focus-visible') ||
        e.target.hasAttribute('data-focus-visible-added')
      ) {
        // To detect a tab/window switch, we look for a blur event followed
        // rapidly by a visibility change.
        // If we don't see a visibility change within 100ms, it's probably a
        // regular focus change.
        hadFocusVisibleRecently = true;
        window.clearTimeout(hadFocusVisibleRecentlyTimeout);
        hadFocusVisibleRecentlyTimeout = window.setTimeout(function() {
          hadFocusVisibleRecently = false;
          window.clearTimeout(hadFocusVisibleRecentlyTimeout);
        }, 100);
        removeFocusVisibleClass(e.target);
      }
    }

    /**
     * If the user changes tabs, keep track of whether or not the previously
     * focused element had .focus-visible.
     * @param {Event} e
     */
    function onVisibilityChange(e) {
      if (document.visibilityState == 'hidden') {
        // If the tab becomes active again, the browser will handle calling focus
        // on the element (Safari actually calls it twice).
        // If this tab change caused a blur on an element with focus-visible,
        // re-apply the class when the user switches back to the tab.
        if (hadFocusVisibleRecently) {
          hadKeyboardEvent = true;
        }
        addInitialPointerMoveListeners();
      }
    }

    /**
     * Add a group of listeners to detect usage of any pointing devices.
     * These listeners will be added when the polyfill first loads, and anytime
     * the window is blurred, so that they are active when the window regains
     * focus.
     */
    function addInitialPointerMoveListeners() {
      document.addEventListener('mousemove', onInitialPointerMove);
      document.addEventListener('mousedown', onInitialPointerMove);
      document.addEventListener('mouseup', onInitialPointerMove);
      document.addEventListener('pointermove', onInitialPointerMove);
      document.addEventListener('pointerdown', onInitialPointerMove);
      document.addEventListener('pointerup', onInitialPointerMove);
      document.addEventListener('touchmove', onInitialPointerMove);
      document.addEventListener('touchstart', onInitialPointerMove);
      document.addEventListener('touchend', onInitialPointerMove);
    }

    function removeInitialPointerMoveListeners() {
      document.removeEventListener('mousemove', onInitialPointerMove);
      document.removeEventListener('mousedown', onInitialPointerMove);
      document.removeEventListener('mouseup', onInitialPointerMove);
      document.removeEventListener('pointermove', onInitialPointerMove);
      document.removeEventListener('pointerdown', onInitialPointerMove);
      document.removeEventListener('pointerup', onInitialPointerMove);
      document.removeEventListener('touchmove', onInitialPointerMove);
      document.removeEventListener('touchstart', onInitialPointerMove);
      document.removeEventListener('touchend', onInitialPointerMove);
    }

    /**
     * When the polfyill first loads, assume the user is in keyboard modality.
     * If any event is received from a pointing device (e.g. mouse, pointer,
     * touch), turn off keyboard modality.
     * This accounts for situations where focus enters the page from the URL bar.
     * @param {Event} e
     */
    function onInitialPointerMove(e) {
      // Work around a Safari quirk that fires a mousemove on <html> whenever the
      // window blurs, even if you're tabbing out of the page. ¯\_(ツ)_/¯
      if (e.target.nodeName.toLowerCase() === 'html') {
        return;
      }

      hadKeyboardEvent = false;
      removeInitialPointerMoveListeners();
    }

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    document.addEventListener('focus', onFocus, true);
    document.addEventListener('blur', onBlur, true);
    document.addEventListener('visibilitychange', onVisibilityChange, true);
    addInitialPointerMoveListeners();

    document.body.classList.add('js-focus-visible');
  }

  /**
   * Subscription when the DOM is ready
   * @param {Function} callback
   */
  function onDOMReady(callback) {
    var loaded;

    /**
     * Callback wrapper for check loaded state
     */
    function load() {
      if (!loaded) {
        loaded = true;

        callback();
      }
    }

    if (['interactive', 'complete'].indexOf(document.readyState) >= 0) {
      callback();
    } else {
      loaded = false;
      document.addEventListener('DOMContentLoaded', load, false);
      window.addEventListener('load', load, false);
    }
  }

  if (typeof document !== 'undefined') {
    onDOMReady(init);
  }

})));

},{}],2:[function(require,module,exports){
'use strict';

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _appHomeHome = require('./app/home/home');

var _appHomeHome2 = _interopRequireDefault(_appHomeHome);

var _appSearchSearch = require('./app/search/search');

var _appSearchSearch2 = _interopRequireDefault(_appSearchSearch);

var _appOutletOutlet = require('./app/outlet/outlet');

var _appOutletOutlet2 = _interopRequireDefault(_appOutletOutlet);

var _appProductProduct = require('./app/product/product');

var _appProductProduct2 = _interopRequireDefault(_appProductProduct);

var _appProductCategoryProductCategory = require('./app/productCategory/productCategory');

var _appProductCategoryProductCategory2 = _interopRequireDefault(_appProductCategoryProductCategory);

var _appDestockDestock = require('./app/destock/destock');

var _appDestockDestock2 = _interopRequireDefault(_appDestockDestock);

var _appDestockCategoryDestockCategory = require('./app/destockCategory/destockCategory');

var _appDestockCategoryDestockCategory2 = _interopRequireDefault(_appDestockCategoryDestockCategory);

var _appContentCategoryContentCategory = require('./app/contentCategory/contentCategory');

var _appContentCategoryContentCategory2 = _interopRequireDefault(_appContentCategoryContentCategory);

var _configMapJs = require('./config/map.js');

var _configMapJs2 = _interopRequireDefault(_configMapJs);

/*jshint unused:true */

var _node_modulesFocusVisibleDistFocusVisible = require('../node_modules/focus-visible/dist/focus-visible');

var focusVisible = _interopRequireWildcard(_node_modulesFocusVisibleDistFocusVisible);

/*jshint unused:false */

var mapConfig = _configMapJs2['default'];var clientConfig = {
    home: {
        callback: _appHomeHome2['default'].create,
        params: {}
    },
    search: {
        callback: _appSearchSearch2['default'].create,
        params: { mapConfig: mapConfig }
    },
    outlet: {
        callback: _appOutletOutlet2['default'].create,
        params: { mapConfig: mapConfig }
    },
    product: {
        callback: _appProductProduct2['default'].create,
        params: {}
    },
    productCategory: {
        callback: _appProductCategoryProductCategory2['default'].create,
        params: {}
    },
    destockCategory: {
        callback: _appDestockCategoryDestockCategory2['default'].create,
        params: {}
    },
    destock: {
        callback: _appDestockDestock2['default'].create,
        params: {}
    },
    contentCategory: {
        callback: _appContentCategoryContentCategory2['default'].create,
        params: { mapConfig: mapConfig }
    }
};

window.Bridge.loadApp(clientConfig);

},{"../node_modules/focus-visible/dist/focus-visible":1,"./app/contentCategory/contentCategory":3,"./app/destock/destock":5,"./app/destockCategory/destockCategory":4,"./app/home/home":6,"./app/outlet/outlet":7,"./app/product/product":9,"./app/productCategory/productCategory":8,"./app/search/search":10,"./config/map.js":12}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var contentCategory = {
    create: function create(liquids) {
        // Put here custom client code for the outlet page
        /*jshint unused:false */
    }
};

exports['default'] = contentCategory;
module.exports = exports['default'];

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var destockCategory = {
    create: function create(liquids) {
        // Put here custom client code for the outlet page
        /*jshint unused:false */
    }
};

exports['default'] = destockCategory;
module.exports = exports['default'];

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var destock = {
    create: function create(liquids) {
        // Put here custom client code for the outlet page
        /*jshint unused:false */
    }
};

exports['default'] = destock;
module.exports = exports['default'];

},{}],6:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _staticSearchBar = require('../static/searchBar');

var _staticSearchBar2 = _interopRequireDefault(_staticSearchBar);

var home = {
    create: function create(liquids) {
        // Put here custom client code for the home page
        /*jshint unused:false */
        /* jshint ignore:start */
        $('.components-form-search-searchbar__submit').click(function () {
            var axel = Math.random() + '';
            var a = axel * 10000000000000;
            var country = $('#countrySelector').find(':button').attr('title');
            var city = $('#citySelector').find(':button').attr('title');
            $('body').prepend('<iframe src="https://4282517.fls.doubleclick.net/activityi;src=4282517;type=vbr_e0;cat=eng_s0;u12=' + country + ';u13=' + city + ';dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;ord=' + a + '?" width="1" height="1" frameborder="0" style="display:none"></iframe>');
        });
        $('[data-lf-search-berluti-geolocation]').click(function () {
            var axel = Math.random() + '';
            var a = axel * 10000000000000;

            var chromeVersion = 0;
            var safariVersion = 0;
            var browser = getBrowser();

            if (browser.name === 'Chrome') {
                chromeVersion = browser.version;
            }

            if (browser.name === 'Safari') {
                safariVersion = browser.version;
            }

            if (chromeVersion >= 50 || safariVersion >= 10) {
                // fallback for Chrome > 50 on http

                jQuery.getJSON('/geocode.json', function (data) {
                    onSuccess({
                        coords: {
                            latitude: data.latitude,
                            longitude: data.longitude
                        }
                    });
                });
            } else {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
                        maximumAge: 50000,
                        timeout: 20000
                    });
                }
            }

            function onError(error) {
                switch (error.code) {
                    case error.TIMEOUT:
                        notifier.addNotification('geolocationTimeout', 5000);
                        break;
                    case error.PERMISSION_DENIED:
                        notifier.addNotification('geolocationPermissionDenied', 5000);
                        break;
                    case error.POSITION_UNAVAILABLE:
                        notifier.addNotification('geolocationPositionUnavailable', 5000);
                        break;
                    default:
                        break;
                }
            }

            function onSuccess(position) {
                $.ajax({
                    method: 'GET',
                    url: 'https://nominatim.openstreetmap.org/reverse',
                    data: {
                        format: 'json',
                        zoom: 18,
                        addressdetails: 1,
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    },
                    contentType: 'application/x-www-form-urlencoded',
                    dataType: 'json'
                }).done(function (data) {
                    var city = data.address.village || data.address.town || data.address.city;
                    $('body').prepend('<iframe src="https://4282517.fls.doubleclick.net/activityi;src=4282517;type=vbr_e0;cat=eng_f00;u4=' + data.address.postcode + ';u12=' + data.address.country + ';u13=' + city + ';dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;ord=' + a + '?" width="1" height="1" frameborder="0" style="display:none"></iframe>');
                    window.location.href = $('[data-lf-search-url]').data('lf-search-url') + '?lat=' + position.coords.latitude + '&lng=' + position.coords.longitude;
                });
            }

            function getBrowser() {
                var ua = navigator.userAgent,
                    tem,
                    M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
                if (/trident/i.test(M[1])) {
                    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                    return { name: 'IE', version: tem[1] || '' };
                }
                if (M[1] === 'Chrome') {
                    tem = ua.match(/\bOPR\/(\d+)/);
                    if (tem != null) {
                        return { name: 'Opera', version: tem[1] };
                    }
                }
                M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
                if ((tem = ua.match(/version\/(\d+)/i)) != null) {
                    M.splice(1, 1, tem[1]);
                }
                return {
                    name: M[0],
                    version: M[1]
                };
            }
        });
        /* jshint ignore:end */
        (0, _staticSearchBar2['default'])();
    }
};

exports['default'] = home;
module.exports = exports['default'];

},{"../static/searchBar":11}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var outlet = {
    create: function create(liquids) {

        liquids.map.options.disableDefaultUI = true;
        // Put here custom client code for the outlet page
        /*jshint unused:false */

        $('[data-lf-owl-smart-tag-service]').owlCarousel({
            margin: 30,
            loop: true,
            responsiveClass: true,
            autoplay: true,
            autoplayHoverPause: true,
            autoplayTimeout: 5000,
            smartSpeed: 500,
            nav: false,
            responsive: {
                0: {
                    items: 1
                },
                768: {
                    items: 2
                },
                992: {
                    items: 3
                }
            }
        });

        $('[data-lf-owl-smart-tag-produit]').owlCarousel({
            margin: 30,
            loop: true,
            responsiveClass: true,
            autoplay: true,
            autoplayHoverPause: true,
            autoplayTimeout: 5000,
            smartSpeed: 500,
            nav: false,
            responsive: {
                0: {
                    items: 1
                },
                768: {
                    items: 2
                },
                992: {
                    items: 3
                }
            }
        });

        //Functions to Toggle outlet hours div desktop
        $('[data-lf-overlay-btn]').click(function () {
            var val = $(this).attr('data-lf-overlay-btn');
            var isActive = $('[data-lf-overlay][data-lf-' + val + '-container]').hasClass('active');

            $('[data-lf-overlay]').removeClass('active');

            if ($('[data-lf-hours-btn-show]').hasClass('hidden')) {
                $('[data-lf-hours-btn-hide]').addClass('hidden');
                $('[data-lf-hours-btn-show]').removeClass('hidden');
            }

            if (!isActive) {
                $('[data-lf-overlay][data-lf-' + val + '-container]').addClass('active');
            }
        });

        $('[data-lf-carousel-paused]').each(function (id, el) {
            var $el = $(el);

            if ($el.length) {
                $el.find('.carousel-inner .item:first, .carousel-indicators li:first').addClass('active');

                $el.carousel({
                    interval: false
                });

                $el.hammer().on('swipeleft', function () {
                    $el.carousel('next');
                });

                $el.hammer().on('swiperight', function () {
                    $el.carousel('prev');
                });
            }
        });

        $('[data-lf-hours-btn-hide], [data-lf-hours-btn-show]').click(function () {
            $('[data-lf-hours-btn-hide], [data-lf-hours-btn-show]').toggleClass('hidden');
        });

        $('[data-lf-overlay-close]').click(function () {
            $('[data-lf-overlay]').removeClass('active');
        });

        $('[data-lf-map-overlay]').click(function () {
            $(this).remove();
        });

        $('[data-lf-link]').click(function (e) {
            e.preventDefault();
            e.stopPropagation();

            $('html, body').animate({
                scrollTop: $($(this).attr('href')).offset().top - $('#outlet-navbar').height()
            });
        });

        $('.js-contact-us').click(function () {
            // Figure out element to scroll to
            var target = $('.components-form-contact-basic');
            // Does a scroll target exist?
            if (target.length) {
                // Only prevent default if animation is actually gonna happen
                event.preventDefault();
                $('html, body').animate({
                    scrollTop: target.offset().top
                }, 1000);
            }
        });

        // function initSelect(element, refresh) {
        //     refresh = typeof refresh !== 'undefined' ? refresh : false;
        //     element.selectpicker('render');
        //     if (refresh) {
        //         element.selectpicker('refresh');
        //     }
        // }
        // initSelect($('.sf_select'));

        $('form[data-lf-pos-contactform]').formValidation({
            framework: 'bootstrap',
            excluded: ':disabled'
        });

        $('[data-lf-newsletter-button]').click(function () {
            var interOpen = setInterval(function () {
                if ($('body').hasClass('modal-open')) {
                    $('body').attr('aria-hidden', true);
                    clearInterval(interOpen);
                }
            }, 100);

            var interClose = setInterval(function () {
                if (!$('body').hasClass('modal-open')) {
                    $('body').attr('aria-hidden', false);
                    clearInterval(interClose);
                }
            }, 100);
        });

        $('#contact-form-link').click(function () {
            $('#form-contact-us').focus();
        });

        $('form[data-lf-pos-contactform]').submit(function () {
            if (!$('form[data-lf-pos-contactform]').valid) {
                $('form[data-lf-pos-contactform] .has-error').each(function () {
                    var hasErrorEl = $(this);
                    assignAriaOnSmall(hasErrorEl, 'input');
                    assignAriaOnSmall(hasErrorEl, 'select');
                });
            } else {
                removeAriaOnSmall($('form[data-lf-pos-contactform]'), 'input');
                removeAriaOnSmall($('form[data-lf-pos-contactform]'), 'select');
            }
        });

        $('form[data-lf-form-address]').submit(function () {
            if (!$('form[data-lf-form-address]').valid) {
                $('form[data-lf-form-address] .has-error').each(function () {
                    var hasErrorEl = $(this);
                    assignAriaOnSmall(hasErrorEl, 'input');
                    assignAriaOnSmall(hasErrorEl, 'select');
                });
            } else {
                removeAriaOnSmall($('form[data-lf-form-address]'), 'input');
                removeAriaOnSmall($('form[data-lf-form-address]'), 'select');
            }
        });

        function assignAriaOnSmall(errorDiv, element) {
            var elementList = $(errorDiv).find(element);
            elementList.each(function () {
                var small = $(errorDiv).find('small');
                $(this).attr('aria-describedby', $(this).attr('data-lf-aria-described'));
                var ariaMessageError = $(this).attr('aria-describedby').split(' ');

                small.each(function () {
                    var validity = $(this).attr('data-fv-result');
                    var errorType = $(this).attr('data-fv-validator');
                    if (validity === 'INVALID') {
                        if (errorType === 'notEmpty') {
                            $(this).attr('id', ariaMessageError[0]);
                        } else {
                            $(this).attr('id', ariaMessageError[1]);
                        }
                    }
                });
            });
        }

        function removeAriaOnSmall(form, element) {
            var elementList = form.find(element);
            elementList.each(function () {
                $(this).attr('aria-describedby', '');
            });
        }

        focusModal($('#lf-offers-opens'));
        focusModal($('#lf-address-opens'));

        function focusModal(link) {
            link.click(function () {
                $('[data-lf-modal-close-button]').focus();
                $('[data-lf-modal-close-button]').click(function () {
                    link.focus();
                });
            });
        }

        // $('.pos-sf-form input[type=submit]').click(function() {
        //     var res = true;
        //     var selector = '.pos-sf-form select[name=00Nb0000009w5f7]';
        //     selector += ',.pos-sf-form select[name=00Nb0000009w5ei]';
        //     selector += ',#legal_disclaimer';
        //
        //     $(selector).each(function(){
        //         var parent = $(this).parents('.form-group');
        //         var helpBlock = $(parent).children('.help-block');
        //         if($(this).val() === '' || $(this).val() === null || !$(this).is(':checked')) {
        //             res = false;
        //             parent.addClass('has-error');
        //             $(helpBlock).attr('style', '');
        //         } else {
        //             parent.removeClass('has-error');
        //             $(helpBlock).css('display', 'none');
        //         }
        //     });
        //
        //     if(res) {
        //         return true;
        //     }
        //     return false;
        // });
    }
};

exports['default'] = outlet;
module.exports = exports['default'];

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var productCategory = {
    create: function create(liquids) {
        // Put here custom client code for the outlet page
        /*jshint unused:false */
    }
};

exports['default'] = productCategory;
module.exports = exports['default'];

},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
var product = {
    create: function create(liquids) {
        // Put here custom client code for the outlet page
        /*jshint unused:false */
    }
};

exports['default'] = product;
module.exports = exports['default'];

},{}],10:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _staticSearchBar = require('../static/searchBar');

var _staticSearchBar2 = _interopRequireDefault(_staticSearchBar);

var search = {
    create: function create(liquids) {
        // Put here custom client code for the search page
        /*jshint unused:false */

        (0, _staticSearchBar2['default'])();

        $('[data-lf-mobile-see-map-custom]').on('click keyup', function () {
            $('#see-map-button').attr('aria-expanded', function (index, attr) {
                return attr === 'true' ? 'false' : 'true';
            });

            $('[data-lf-map-actived-custom]').attr('data-lf-map-actived-custom', function (index, attr) {
                return attr === 'true' ? 'false' : 'true';
            });

            if ($('[data-lf-map-actived-custom]').attr('data-lf-map-actived-custom') === 'true') {
                $('[data-lf-map-actived-custom]').scrollTop(0);
            }
        });

        $('[data-lf-marker-id]').click(function () {
            var currentID = $(this).attr('data-lf-marker-id');
            window.setTimeout(function () {
                $('[data-lf-info-window]').attr('aria-expanded', true);

                $('[data-lf-info-window-button]').focus();

                $('[data-lf-info-window-button]').click(function () {

                    /*jshint ignore:start */

                    Bridge.pages.search.map.infoWindow.box.close();

                    /*jshint ignore:end */

                    $('[data-lf-marker-id]').each(function () {
                        if ($(this).attr('data-lf-marker-id') === currentID) {
                            $(this).focus();
                        }
                    });
                });
            }, 300);
        });

        $('[data-lf-marker-id]').keypress(function (e) {
            if (e.which === 13) {
                $('[data-lf-marker-id]').click();
            }
        });

        $('[data-lf-search-geolocation]').click(function () {
            if ($('[data-lf-notifier-list] > div').length > 0) {
                $('[data-lf-notifier-list]').find('div').remove();
            }
            var inter = setInterval(function () {
                if ($('[data-lf-notifier-list] > div').length > 0) {
                    $('[data-lf-notifier-list]').find('div').remove();
                    /*jshint ignore:start */
                    Bridge.ui.notifier.addNotification('geolocationPermissionDenied');
                    /*jshint ignore:end */
                    $('[data-lf-notifier]').addClass('visible');
                    clearInterval(inter);
                }
            }, 100);
        });

        $('[ data-lf-notification-close]').click(function () {
            $('[data-lf-notifier]').removeClass('visible');
            $('[data-lf-notifier-list]').find('div').remove();
            $('[data-lf-notifier]').attr('data-lf-visible', false);
        });
    }
};

exports['default'] = search;
module.exports = exports['default'];

},{"../static/searchBar":11}],11:[function(require,module,exports){
'use strict';
/*jshint ignore:start */
Object.defineProperty(exports, '__esModule', {
    value: true
});
function capitalizeLetter(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ''])[1].replace(/\+/g, '%20')) || null;
}

// function initSelect(element, refresh) {
//     refresh = typeof refresh !== 'undefined' ? refresh : false;
//     element.selectpicker('render');
//     if (refresh) {
//         element.selectpicker('refresh');
//     }
// }

function parseCities(data, local) {
    var cities = [];
    var optioncities = '';
    //if country selector is active
    if (local) {
        for (var k = 0; k < data[local].length; k++) {
            cities[k] = capitalizeLetter(data[local][k]);
            if (cities[k] === '广州市') {
                cities[k] = '广州'; // replace for chinese front
            }
            //add options for select cities
            optioncities += '<option id="cb2-opt' + (k + 1) + '" value="' + cities[k] + '">' + cities[k] + '</option>';
        }
    }
    //if not we display all cities from all countries
    else {
            var key = Object.keys(data);
            var c = 0;
            for (var i = 0; i < key.length; i++) {
                for (var j = 0; j < data[key[i]].length; j++) {
                    cities[c] = capitalizeLetter(data[key[i]][j]);
                    if (cities[c] === '广州市') {
                        cities[c] = '广州'; // replace for chinese front
                    }
                    optioncities += '<option id="cb2-opt' + (c + 1) + '" value="' + cities[c] + '">' + cities[c] + '</option>';
                    c++;
                }
            }
        }

    $('#query').typeahead({
        selector: {
            dropdown: 'dropdown-menu dropdown-menu-right',
            list: 'dropdown-menu',
            hint: 'form-control'
        },
        source: {
            data: cities
        }
    });
    // select cities add option optioncities
    var $selectcities = $('#query');
    // remove all options of select
    $selectcities.html(optioncities);

    var queryCode = getURLParameter('query');
    if (queryCode == null) {
        $selectcities.find('option:eq(0)').prop('selected', true);
    } else {
        $selectcities.find('option[value="' + queryCode + '"]').prop('selected', true);
    }
    //initSelect($selectcities, true);
}

exports['default'] = function () {
    //init select cities #query
    var dataJson;

    //Set country and categorie to research value (Start)
    var countryCode = getURLParameter('country');
    var $countrySelector = $('#country');

    if (countryCode == null) {
        $.getJSON('/geocode.json', function (data) {
            $countrySelector.find('option[value=' + data.country_code + ']').prop('selected', true);
            //initSelect($countrySelector);

            var localCountry = $('#country').val();

            $.ajax({
                url: window.location.protocol + '//' + window.location.hostname + '/cities.json',
                type: 'GET',
                dataType: 'json',
                success: function success(data) {
                    dataJson = data;
                    parseCities(data, localCountry);
                }
            });
        });
    } else {
        $countrySelector.find('option[value=' + countryCode + ']').prop('selected', true);

        //initSelect($countrySelector);

        var localCountry = $('#country').val();

        $.ajax({
            url: window.location.protocol + '//' + window.location.hostname + '/cities.json',
            type: 'GET',
            dataType: 'json',
            success: function success(data) {
                dataJson = data;
                parseCities(data, localCountry);
            }
        });
    }

    //Autocomplete (Start)
    $('#country').change(function () {
        var localUpdate = $('#country').val();
        parseCities(dataJson, localUpdate);
    });
};

/*jshint ignore:end */
module.exports = exports['default'];

},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

exports['default'] = function (provider, options, key) {

    var IDLE = false;
    if (window.Bridge.pages.outlet.map) {
        (function () {
            var INT = setInterval(function () {
                if (window.Bridge.pages.outlet.map.map) {
                    clearInterval(INT);
                    window.Bridge.pages.outlet.map.map.addListener('idle', function () {
                        if (!IDLE) {
                            IDLE = true;

                            window.Bridge.pages.outlet.map.map.setOptions({
                                zoomControl: false,
                                mapTypeControl: false,
                                streetViewControl: false,
                                fullscreenControl: true,
                                fullscreenControlOptions: {
                                    position: google.maps.ControlPosition.BOTTOM_CENTER
                                }
                            });
                        }
                    });
                }
            }, 200);
        })();
    }

    var mapConf = window.Bridge.map.config[provider](options, key);
    mapConf.map.scrollwheel = true;
    return mapConf;
};

module.exports = exports['default'];

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZm9jdXMtdmlzaWJsZS9kaXN0L2ZvY3VzLXZpc2libGUuanMiLCJDOi9Vc2Vycy95aGFraW0vRGVza3RvcC92Mi9iZXJsdXRpL3RlbXBsYXRlLTIwMTcvc3JjL2FwcC5qcyIsIkM6L1VzZXJzL3loYWtpbS9EZXNrdG9wL3YyL2Jlcmx1dGkvdGVtcGxhdGUtMjAxNy9zcmMvYXBwL2NvbnRlbnRDYXRlZ29yeS9jb250ZW50Q2F0ZWdvcnkuanMiLCJDOi9Vc2Vycy95aGFraW0vRGVza3RvcC92Mi9iZXJsdXRpL3RlbXBsYXRlLTIwMTcvc3JjL2FwcC9kZXN0b2NrQ2F0ZWdvcnkvZGVzdG9ja0NhdGVnb3J5LmpzIiwiQzovVXNlcnMveWhha2ltL0Rlc2t0b3AvdjIvYmVybHV0aS90ZW1wbGF0ZS0yMDE3L3NyYy9hcHAvZGVzdG9jay9kZXN0b2NrLmpzIiwiQzovVXNlcnMveWhha2ltL0Rlc2t0b3AvdjIvYmVybHV0aS90ZW1wbGF0ZS0yMDE3L3NyYy9hcHAvaG9tZS9ob21lLmpzIiwiQzovVXNlcnMveWhha2ltL0Rlc2t0b3AvdjIvYmVybHV0aS90ZW1wbGF0ZS0yMDE3L3NyYy9hcHAvb3V0bGV0L291dGxldC5qcyIsIkM6L1VzZXJzL3loYWtpbS9EZXNrdG9wL3YyL2Jlcmx1dGkvdGVtcGxhdGUtMjAxNy9zcmMvYXBwL3Byb2R1Y3RDYXRlZ29yeS9wcm9kdWN0Q2F0ZWdvcnkuanMiLCJDOi9Vc2Vycy95aGFraW0vRGVza3RvcC92Mi9iZXJsdXRpL3RlbXBsYXRlLTIwMTcvc3JjL2FwcC9wcm9kdWN0L3Byb2R1Y3QuanMiLCJDOi9Vc2Vycy95aGFraW0vRGVza3RvcC92Mi9iZXJsdXRpL3RlbXBsYXRlLTIwMTcvc3JjL2FwcC9zZWFyY2gvc2VhcmNoLmpzIiwiQzovVXNlcnMveWhha2ltL0Rlc2t0b3AvdjIvYmVybHV0aS90ZW1wbGF0ZS0yMDE3L3NyYy9hcHAvc3RhdGljL3NlYXJjaEJhci5qcyIsIkM6L1VzZXJzL3loYWtpbS9EZXNrdG9wL3YyL2Jlcmx1dGkvdGVtcGxhdGUtMjAxNy9zcmMvY29uZmlnL21hcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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KGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBmYWN0b3J5KCkgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuICAoZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBodHRwczovL2dpdGh1Yi5jb20vV0lDRy9mb2N1cy12aXNpYmxlXG4gICAqL1xuICBmdW5jdGlvbiBpbml0KCkge1xuICAgIHZhciBoYWRLZXlib2FyZEV2ZW50ID0gdHJ1ZTtcbiAgICB2YXIgaGFkRm9jdXNWaXNpYmxlUmVjZW50bHkgPSBmYWxzZTtcbiAgICB2YXIgaGFkRm9jdXNWaXNpYmxlUmVjZW50bHlUaW1lb3V0ID0gbnVsbDtcblxuICAgIHZhciBpbnB1dFR5cGVzV2hpdGVsaXN0ID0ge1xuICAgICAgdGV4dDogdHJ1ZSxcbiAgICAgIHNlYXJjaDogdHJ1ZSxcbiAgICAgIHVybDogdHJ1ZSxcbiAgICAgIHRlbDogdHJ1ZSxcbiAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgcGFzc3dvcmQ6IHRydWUsXG4gICAgICBudW1iZXI6IHRydWUsXG4gICAgICBkYXRlOiB0cnVlLFxuICAgICAgbW9udGg6IHRydWUsXG4gICAgICB3ZWVrOiB0cnVlLFxuICAgICAgdGltZTogdHJ1ZSxcbiAgICAgIGRhdGV0aW1lOiB0cnVlLFxuICAgICAgJ2RhdGV0aW1lLWxvY2FsJzogdHJ1ZVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgZnVuY3Rpb24gZm9yIGxlZ2FjeSBicm93c2VycyBhbmQgaWZyYW1lcyB3aGljaCBzb21ldGltZXMgZm9jdXNcbiAgICAgKiBlbGVtZW50cyBsaWtlIGRvY3VtZW50LCBib2R5LCBhbmQgbm9uLWludGVyYWN0aXZlIFNWRy5cbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNWYWxpZEZvY3VzVGFyZ2V0KGVsKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGVsICYmXG4gICAgICAgIGVsICE9PSBkb2N1bWVudCAmJlxuICAgICAgICBlbC5ub2RlTmFtZSAhPT0gJ0hUTUwnICYmXG4gICAgICAgIGVsLm5vZGVOYW1lICE9PSAnQk9EWScgJiZcbiAgICAgICAgJ2NsYXNzTGlzdCcgaW4gZWwgJiZcbiAgICAgICAgJ2NvbnRhaW5zJyBpbiBlbC5jbGFzc0xpc3RcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wdXRlcyB3aGV0aGVyIHRoZSBnaXZlbiBlbGVtZW50IHNob3VsZCBhdXRvbWF0aWNhbGx5IHRyaWdnZXIgdGhlXG4gICAgICogYGZvY3VzLXZpc2libGVgIGNsYXNzIGJlaW5nIGFkZGVkLCBpLmUuIHdoZXRoZXIgaXQgc2hvdWxkIGFsd2F5cyBtYXRjaFxuICAgICAqIGA6Zm9jdXMtdmlzaWJsZWAgd2hlbiBmb2N1c2VkLlxuICAgICAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZvY3VzVHJpZ2dlcnNLZXlib2FyZE1vZGFsaXR5KGVsKSB7XG4gICAgICB2YXIgdHlwZSA9IGVsLnR5cGU7XG4gICAgICB2YXIgdGFnTmFtZSA9IGVsLnRhZ05hbWU7XG5cbiAgICAgIGlmICh0YWdOYW1lID09ICdJTlBVVCcgJiYgaW5wdXRUeXBlc1doaXRlbGlzdFt0eXBlXSAmJiAhZWwucmVhZE9ubHkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0YWdOYW1lID09ICdURVhUQVJFQScgJiYgIWVsLnJlYWRPbmx5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoZWwuaXNDb250ZW50RWRpdGFibGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgdGhlIGBmb2N1cy12aXNpYmxlYCBjbGFzcyB0byB0aGUgZ2l2ZW4gZWxlbWVudCBpZiBpdCB3YXMgbm90IGFkZGVkIGJ5XG4gICAgICogdGhlIGF1dGhvci5cbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkRm9jdXNWaXNpYmxlQ2xhc3MoZWwpIHtcbiAgICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2ZvY3VzLXZpc2libGUnKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKCdmb2N1cy12aXNpYmxlJyk7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtZm9jdXMtdmlzaWJsZS1hZGRlZCcsICcnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgdGhlIGBmb2N1cy12aXNpYmxlYCBjbGFzcyBmcm9tIHRoZSBnaXZlbiBlbGVtZW50IGlmIGl0IHdhcyBub3RcbiAgICAgKiBvcmlnaW5hbGx5IGFkZGVkIGJ5IHRoZSBhdXRob3IuXG4gICAgICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlbW92ZUZvY3VzVmlzaWJsZUNsYXNzKGVsKSB7XG4gICAgICBpZiAoIWVsLmhhc0F0dHJpYnV0ZSgnZGF0YS1mb2N1cy12aXNpYmxlLWFkZGVkJykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnZm9jdXMtdmlzaWJsZScpO1xuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdkYXRhLWZvY3VzLXZpc2libGUtYWRkZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmVhdCBga2V5ZG93bmAgYXMgYSBzaWduYWwgdGhhdCB0aGUgdXNlciBpcyBpbiBrZXlib2FyZCBtb2RhbGl0eS5cbiAgICAgKiBBcHBseSBgZm9jdXMtdmlzaWJsZWAgdG8gYW55IGN1cnJlbnQgYWN0aXZlIGVsZW1lbnQgYW5kIGtlZXAgdHJhY2tcbiAgICAgKiBvZiBvdXIga2V5Ym9hcmQgbW9kYWxpdHkgc3RhdGUgd2l0aCBgaGFkS2V5Ym9hcmRFdmVudGAuXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uS2V5RG93bihlKSB7XG4gICAgICBpZiAoaXNWYWxpZEZvY3VzVGFyZ2V0KGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpKSB7XG4gICAgICAgIGFkZEZvY3VzVmlzaWJsZUNsYXNzKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpO1xuICAgICAgfVxuXG4gICAgICBoYWRLZXlib2FyZEV2ZW50ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJZiBhdCBhbnkgcG9pbnQgYSB1c2VyIGNsaWNrcyB3aXRoIGEgcG9pbnRpbmcgZGV2aWNlLCBlbnN1cmUgdGhhdCB3ZSBjaGFuZ2VcbiAgICAgKiB0aGUgbW9kYWxpdHkgYXdheSBmcm9tIGtleWJvYXJkLlxuICAgICAqIFRoaXMgYXZvaWRzIHRoZSBzaXR1YXRpb24gd2hlcmUgYSB1c2VyIHByZXNzZXMgYSBrZXkgb24gYW4gYWxyZWFkeSBmb2N1c2VkXG4gICAgICogZWxlbWVudCwgYW5kIHRoZW4gY2xpY2tzIG9uIGEgZGlmZmVyZW50IGVsZW1lbnQsIGZvY3VzaW5nIGl0IHdpdGggYVxuICAgICAqIHBvaW50aW5nIGRldmljZSwgd2hpbGUgd2Ugc3RpbGwgdGhpbmsgd2UncmUgaW4ga2V5Ym9hcmQgbW9kYWxpdHkuXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uUG9pbnRlckRvd24oZSkge1xuICAgICAgaGFkS2V5Ym9hcmRFdmVudCA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIGBmb2N1c2AsIGFkZCB0aGUgYGZvY3VzLXZpc2libGVgIGNsYXNzIHRvIHRoZSB0YXJnZXQgaWY6XG4gICAgICogLSB0aGUgdGFyZ2V0IHJlY2VpdmVkIGZvY3VzIGFzIGEgcmVzdWx0IG9mIGtleWJvYXJkIG5hdmlnYXRpb24sIG9yXG4gICAgICogLSB0aGUgZXZlbnQgdGFyZ2V0IGlzIGFuIGVsZW1lbnQgdGhhdCB3aWxsIGxpa2VseSByZXF1aXJlIGludGVyYWN0aW9uXG4gICAgICogICB2aWEgdGhlIGtleWJvYXJkIChlLmcuIGEgdGV4dCBib3gpXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uRm9jdXMoZSkge1xuICAgICAgLy8gUHJldmVudCBJRSBmcm9tIGZvY3VzaW5nIHRoZSBkb2N1bWVudCBvciBIVE1MIGVsZW1lbnQuXG4gICAgICBpZiAoIWlzVmFsaWRGb2N1c1RhcmdldChlLnRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGFkS2V5Ym9hcmRFdmVudCB8fCBmb2N1c1RyaWdnZXJzS2V5Ym9hcmRNb2RhbGl0eShlLnRhcmdldCkpIHtcbiAgICAgICAgYWRkRm9jdXNWaXNpYmxlQ2xhc3MoZS50YXJnZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE9uIGBibHVyYCwgcmVtb3ZlIHRoZSBgZm9jdXMtdmlzaWJsZWAgY2xhc3MgZnJvbSB0aGUgdGFyZ2V0LlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvbkJsdXIoZSkge1xuICAgICAgaWYgKCFpc1ZhbGlkRm9jdXNUYXJnZXQoZS50YXJnZXQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICBlLnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2ZvY3VzLXZpc2libGUnKSB8fFxuICAgICAgICBlLnRhcmdldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtZm9jdXMtdmlzaWJsZS1hZGRlZCcpXG4gICAgICApIHtcbiAgICAgICAgLy8gVG8gZGV0ZWN0IGEgdGFiL3dpbmRvdyBzd2l0Y2gsIHdlIGxvb2sgZm9yIGEgYmx1ciBldmVudCBmb2xsb3dlZFxuICAgICAgICAvLyByYXBpZGx5IGJ5IGEgdmlzaWJpbGl0eSBjaGFuZ2UuXG4gICAgICAgIC8vIElmIHdlIGRvbid0IHNlZSBhIHZpc2liaWxpdHkgY2hhbmdlIHdpdGhpbiAxMDBtcywgaXQncyBwcm9iYWJseSBhXG4gICAgICAgIC8vIHJlZ3VsYXIgZm9jdXMgY2hhbmdlLlxuICAgICAgICBoYWRGb2N1c1Zpc2libGVSZWNlbnRseSA9IHRydWU7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQoaGFkRm9jdXNWaXNpYmxlUmVjZW50bHlUaW1lb3V0KTtcbiAgICAgICAgaGFkRm9jdXNWaXNpYmxlUmVjZW50bHlUaW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaGFkRm9jdXNWaXNpYmxlUmVjZW50bHkgPSBmYWxzZTtcbiAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KGhhZEZvY3VzVmlzaWJsZVJlY2VudGx5VGltZW91dCk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgICAgIHJlbW92ZUZvY3VzVmlzaWJsZUNsYXNzKGUudGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJZiB0aGUgdXNlciBjaGFuZ2VzIHRhYnMsIGtlZXAgdHJhY2sgb2Ygd2hldGhlciBvciBub3QgdGhlIHByZXZpb3VzbHlcbiAgICAgKiBmb2N1c2VkIGVsZW1lbnQgaGFkIC5mb2N1cy12aXNpYmxlLlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBvblZpc2liaWxpdHlDaGFuZ2UoZSkge1xuICAgICAgaWYgKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA9PSAnaGlkZGVuJykge1xuICAgICAgICAvLyBJZiB0aGUgdGFiIGJlY29tZXMgYWN0aXZlIGFnYWluLCB0aGUgYnJvd3NlciB3aWxsIGhhbmRsZSBjYWxsaW5nIGZvY3VzXG4gICAgICAgIC8vIG9uIHRoZSBlbGVtZW50IChTYWZhcmkgYWN0dWFsbHkgY2FsbHMgaXQgdHdpY2UpLlxuICAgICAgICAvLyBJZiB0aGlzIHRhYiBjaGFuZ2UgY2F1c2VkIGEgYmx1ciBvbiBhbiBlbGVtZW50IHdpdGggZm9jdXMtdmlzaWJsZSxcbiAgICAgICAgLy8gcmUtYXBwbHkgdGhlIGNsYXNzIHdoZW4gdGhlIHVzZXIgc3dpdGNoZXMgYmFjayB0byB0aGUgdGFiLlxuICAgICAgICBpZiAoaGFkRm9jdXNWaXNpYmxlUmVjZW50bHkpIHtcbiAgICAgICAgICBoYWRLZXlib2FyZEV2ZW50ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBhZGRJbml0aWFsUG9pbnRlck1vdmVMaXN0ZW5lcnMoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBncm91cCBvZiBsaXN0ZW5lcnMgdG8gZGV0ZWN0IHVzYWdlIG9mIGFueSBwb2ludGluZyBkZXZpY2VzLlxuICAgICAqIFRoZXNlIGxpc3RlbmVycyB3aWxsIGJlIGFkZGVkIHdoZW4gdGhlIHBvbHlmaWxsIGZpcnN0IGxvYWRzLCBhbmQgYW55dGltZVxuICAgICAqIHRoZSB3aW5kb3cgaXMgYmx1cnJlZCwgc28gdGhhdCB0aGV5IGFyZSBhY3RpdmUgd2hlbiB0aGUgd2luZG93IHJlZ2FpbnNcbiAgICAgKiBmb2N1cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhZGRJbml0aWFsUG9pbnRlck1vdmVMaXN0ZW5lcnMoKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25Jbml0aWFsUG9pbnRlck1vdmUpO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVJbml0aWFsUG9pbnRlck1vdmVMaXN0ZW5lcnMoKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25Jbml0aWFsUG9pbnRlck1vdmUpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvbkluaXRpYWxQb2ludGVyTW92ZSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uSW5pdGlhbFBvaW50ZXJNb3ZlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXaGVuIHRoZSBwb2xmeWlsbCBmaXJzdCBsb2FkcywgYXNzdW1lIHRoZSB1c2VyIGlzIGluIGtleWJvYXJkIG1vZGFsaXR5LlxuICAgICAqIElmIGFueSBldmVudCBpcyByZWNlaXZlZCBmcm9tIGEgcG9pbnRpbmcgZGV2aWNlIChlLmcuIG1vdXNlLCBwb2ludGVyLFxuICAgICAqIHRvdWNoKSwgdHVybiBvZmYga2V5Ym9hcmQgbW9kYWxpdHkuXG4gICAgICogVGhpcyBhY2NvdW50cyBmb3Igc2l0dWF0aW9ucyB3aGVyZSBmb2N1cyBlbnRlcnMgdGhlIHBhZ2UgZnJvbSB0aGUgVVJMIGJhci5cbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlXG4gICAgICovXG4gICAgZnVuY3Rpb24gb25Jbml0aWFsUG9pbnRlck1vdmUoZSkge1xuICAgICAgLy8gV29yayBhcm91bmQgYSBTYWZhcmkgcXVpcmsgdGhhdCBmaXJlcyBhIG1vdXNlbW92ZSBvbiA8aHRtbD4gd2hlbmV2ZXIgdGhlXG4gICAgICAvLyB3aW5kb3cgYmx1cnMsIGV2ZW4gaWYgeW91J3JlIHRhYmJpbmcgb3V0IG9mIHRoZSBwYWdlLiDCr1xcXyjjg4QpXy/Cr1xuICAgICAgaWYgKGUudGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdodG1sJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGhhZEtleWJvYXJkRXZlbnQgPSBmYWxzZTtcbiAgICAgIHJlbW92ZUluaXRpYWxQb2ludGVyTW92ZUxpc3RlbmVycygpO1xuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBvbktleURvd24sIHRydWUpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIG9uUG9pbnRlckRvd24sIHRydWUpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJywgb25Qb2ludGVyRG93biwgdHJ1ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uUG9pbnRlckRvd24sIHRydWUpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgb25Gb2N1cywgdHJ1ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIG9uQmx1ciwgdHJ1ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsIG9uVmlzaWJpbGl0eUNoYW5nZSwgdHJ1ZSk7XG4gICAgYWRkSW5pdGlhbFBvaW50ZXJNb3ZlTGlzdGVuZXJzKCk7XG5cbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ2pzLWZvY3VzLXZpc2libGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpcHRpb24gd2hlbiB0aGUgRE9NIGlzIHJlYWR5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBvbkRPTVJlYWR5KGNhbGxiYWNrKSB7XG4gICAgdmFyIGxvYWRlZDtcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIHdyYXBwZXIgZm9yIGNoZWNrIGxvYWRlZCBzdGF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGxvYWQoKSB7XG4gICAgICBpZiAoIWxvYWRlZCkge1xuICAgICAgICBsb2FkZWQgPSB0cnVlO1xuXG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKFsnaW50ZXJhY3RpdmUnLCAnY29tcGxldGUnXS5pbmRleE9mKGRvY3VtZW50LnJlYWR5U3RhdGUpID49IDApIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvYWRlZCA9IGZhbHNlO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGxvYWQsIGZhbHNlKTtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgbG9hZCwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgb25ET01SZWFkeShpbml0KTtcbiAgfVxuXG59KSkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IGNsaWVudEhvbWUgZnJvbSAnLi9hcHAvaG9tZS9ob21lJztcclxuaW1wb3J0IGNsaWVudFNlYXJjaCBmcm9tICcuL2FwcC9zZWFyY2gvc2VhcmNoJztcclxuaW1wb3J0IGNsaWVudE91dGxldCBmcm9tICcuL2FwcC9vdXRsZXQvb3V0bGV0JztcclxuaW1wb3J0IGNsaWVudFByb2R1Y3QgZnJvbSAnLi9hcHAvcHJvZHVjdC9wcm9kdWN0JztcclxuaW1wb3J0IGNsaWVudFByb2R1Y3RDYXRlZ29yeSBmcm9tICcuL2FwcC9wcm9kdWN0Q2F0ZWdvcnkvcHJvZHVjdENhdGVnb3J5JztcclxuaW1wb3J0IGNsaWVudERlc3RvY2sgZnJvbSAnLi9hcHAvZGVzdG9jay9kZXN0b2NrJztcclxuaW1wb3J0IGNsaWVudERlc3RvY2tDYXRlZ29yeSBmcm9tICcuL2FwcC9kZXN0b2NrQ2F0ZWdvcnkvZGVzdG9ja0NhdGVnb3J5JztcclxuaW1wb3J0IGNsaWVudENvbnRlbnRDYXRlZ29yeSBmcm9tICcuL2FwcC9jb250ZW50Q2F0ZWdvcnkvY29udGVudENhdGVnb3J5JztcclxuXHJcbmltcG9ydCBtYXBDb25maWdEZWZhdWx0IGZyb20gJy4vY29uZmlnL21hcC5qcyc7XHJcblxyXG5sZXQgbWFwQ29uZmlnID0gbWFwQ29uZmlnRGVmYXVsdDtcclxuXHJcbi8qanNoaW50IHVudXNlZDp0cnVlICovXHJcblxyXG5pbXBvcnQgKiBhcyBmb2N1c1Zpc2libGUgZnJvbSAnLi4vbm9kZV9tb2R1bGVzL2ZvY3VzLXZpc2libGUvZGlzdC9mb2N1cy12aXNpYmxlJztcclxuXHJcbi8qanNoaW50IHVudXNlZDpmYWxzZSAqL1xyXG5cclxuXHJcbmNvbnN0IGNsaWVudENvbmZpZyA9IHtcclxuICAgIGhvbWU6IHtcclxuICAgICAgICBjYWxsYmFjazogY2xpZW50SG9tZS5jcmVhdGUsXHJcbiAgICAgICAgcGFyYW1zOiB7fVxyXG4gICAgfSxcclxuICAgIHNlYXJjaDoge1xyXG4gICAgICAgIGNhbGxiYWNrOiBjbGllbnRTZWFyY2guY3JlYXRlLFxyXG4gICAgICAgIHBhcmFtczogeyBtYXBDb25maWc6IG1hcENvbmZpZyB9XHJcbiAgICB9LFxyXG4gICAgb3V0bGV0OiB7XHJcbiAgICAgICAgY2FsbGJhY2s6IGNsaWVudE91dGxldC5jcmVhdGUsXHJcbiAgICAgICAgcGFyYW1zOiB7IG1hcENvbmZpZzogbWFwQ29uZmlnIH1cclxuICAgIH0sXHJcbiAgICBwcm9kdWN0OiB7XHJcbiAgICAgICAgY2FsbGJhY2s6IGNsaWVudFByb2R1Y3QuY3JlYXRlLFxyXG4gICAgICAgIHBhcmFtczoge31cclxuICAgIH0sXHJcbiAgICBwcm9kdWN0Q2F0ZWdvcnk6IHtcclxuICAgICAgICBjYWxsYmFjazogY2xpZW50UHJvZHVjdENhdGVnb3J5LmNyZWF0ZSxcclxuICAgICAgICBwYXJhbXM6IHt9XHJcbiAgICB9LFxyXG4gICAgZGVzdG9ja0NhdGVnb3J5OiB7XHJcbiAgICAgICAgY2FsbGJhY2s6IGNsaWVudERlc3RvY2tDYXRlZ29yeS5jcmVhdGUsXHJcbiAgICAgICAgcGFyYW1zOiB7fVxyXG4gICAgfSxcclxuICAgIGRlc3RvY2s6IHtcclxuICAgICAgICBjYWxsYmFjazogY2xpZW50RGVzdG9jay5jcmVhdGUsXHJcbiAgICAgICAgcGFyYW1zOiB7fVxyXG4gICAgfSxcclxuICAgIGNvbnRlbnRDYXRlZ29yeToge1xyXG4gICAgICAgIGNhbGxiYWNrOiBjbGllbnRDb250ZW50Q2F0ZWdvcnkuY3JlYXRlLFxyXG4gICAgICAgIHBhcmFtczogeyBtYXBDb25maWc6IG1hcENvbmZpZyB9XHJcbiAgICB9XHJcbn07XHJcblxyXG53aW5kb3cuQnJpZGdlLmxvYWRBcHAoY2xpZW50Q29uZmlnKTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuY29uc3QgY29udGVudENhdGVnb3J5ID0ge1xyXG4gICAgY3JlYXRlOiBmdW5jdGlvbihsaXF1aWRzKSB7XHJcbiAgICAgICAgLy8gUHV0IGhlcmUgY3VzdG9tIGNsaWVudCBjb2RlIGZvciB0aGUgb3V0bGV0IHBhZ2VcclxuICAgICAgICAvKmpzaGludCB1bnVzZWQ6ZmFsc2UgKi9cclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNvbnRlbnRDYXRlZ29yeTtcclxuXHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmNvbnN0IGRlc3RvY2tDYXRlZ29yeSA9IHtcclxuICAgIGNyZWF0ZTogZnVuY3Rpb24obGlxdWlkcykge1xyXG4gICAgICAgIC8vIFB1dCBoZXJlIGN1c3RvbSBjbGllbnQgY29kZSBmb3IgdGhlIG91dGxldCBwYWdlXHJcbiAgICAgICAgLypqc2hpbnQgdW51c2VkOmZhbHNlICovXHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZXN0b2NrQ2F0ZWdvcnk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmNvbnN0IGRlc3RvY2sgPSB7XHJcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKGxpcXVpZHMpIHtcclxuICAgICAgICAvLyBQdXQgaGVyZSBjdXN0b20gY2xpZW50IGNvZGUgZm9yIHRoZSBvdXRsZXQgcGFnZVxyXG4gICAgICAgIC8qanNoaW50IHVudXNlZDpmYWxzZSAqL1xyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVzdG9jaztcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5pbXBvcnQgc2VhcmNoQmFyIGZyb20gJy4uL3N0YXRpYy9zZWFyY2hCYXInO1xyXG5cclxuY29uc3QgaG9tZSA9IHtcclxuICAgIGNyZWF0ZTogZnVuY3Rpb24gKGxpcXVpZHMpIHtcclxuICAgICAgICAvLyBQdXQgaGVyZSBjdXN0b20gY2xpZW50IGNvZGUgZm9yIHRoZSBob21lIHBhZ2VcclxuICAgICAgICAvKmpzaGludCB1bnVzZWQ6ZmFsc2UgKi9cclxuICAgICAgICAvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXHJcbiAgICAgICAgJCgnLmNvbXBvbmVudHMtZm9ybS1zZWFyY2gtc2VhcmNoYmFyX19zdWJtaXQnKS5jbGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGF4ZWwgPSBNYXRoLnJhbmRvbSgpICsgJyc7XHJcbiAgICAgICAgICAgIHZhciBhID0gYXhlbCAqIDEwMDAwMDAwMDAwMDAwO1xyXG4gICAgICAgICAgICB2YXIgY291bnRyeSA9ICQoJyNjb3VudHJ5U2VsZWN0b3InKS5maW5kKCc6YnV0dG9uJykuYXR0cigndGl0bGUnKTtcclxuICAgICAgICAgICAgdmFyIGNpdHkgPSAkKCcjY2l0eVNlbGVjdG9yJykuZmluZCgnOmJ1dHRvbicpLmF0dHIoJ3RpdGxlJyk7XHJcbiAgICAgICAgICAgICQoJ2JvZHknKS5wcmVwZW5kKCc8aWZyYW1lIHNyYz1cImh0dHBzOi8vNDI4MjUxNy5mbHMuZG91YmxlY2xpY2submV0L2FjdGl2aXR5aTtzcmM9NDI4MjUxNzt0eXBlPXZicl9lMDtjYXQ9ZW5nX3MwO3UxMj0nICsgY291bnRyeSArICc7dTEzPScgKyBjaXR5ICsgJztkY19sYXQ9O2RjX3JkaWQ9O3RhZ19mb3JfY2hpbGRfZGlyZWN0ZWRfdHJlYXRtZW50PTtvcmQ9JyArIGEgKyAnP1wiIHdpZHRoPVwiMVwiIGhlaWdodD1cIjFcIiBmcmFtZWJvcmRlcj1cIjBcIiBzdHlsZT1cImRpc3BsYXk6bm9uZVwiPjwvaWZyYW1lPicpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgICQoJ1tkYXRhLWxmLXNlYXJjaC1iZXJsdXRpLWdlb2xvY2F0aW9uXScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgYXhlbCA9IE1hdGgucmFuZG9tKCkgKyAnJztcclxuICAgICAgICAgICAgdmFyIGEgPSBheGVsICogMTAwMDAwMDAwMDAwMDA7XHJcblxyXG5cclxuICAgICAgICAgICAgdmFyIGNocm9tZVZlcnNpb24gPSAwO1xyXG4gICAgICAgICAgICB2YXIgc2FmYXJpVmVyc2lvbiA9IDA7XHJcbiAgICAgICAgICAgIHZhciBicm93c2VyID0gZ2V0QnJvd3NlcigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJyb3dzZXIubmFtZSA9PT0gJ0Nocm9tZScpIHtcclxuICAgICAgICAgICAgICAgIGNocm9tZVZlcnNpb24gPSBicm93c2VyLnZlcnNpb247XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChicm93c2VyLm5hbWUgPT09ICdTYWZhcmknKSB7XHJcbiAgICAgICAgICAgICAgICBzYWZhcmlWZXJzaW9uID0gYnJvd3Nlci52ZXJzaW9uO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoKGNocm9tZVZlcnNpb24gPj0gNTAgfHwgc2FmYXJpVmVyc2lvbiA+PSAxMCkpIHtcclxuICAgICAgICAgICAgICAgIC8vIGZhbGxiYWNrIGZvciBDaHJvbWUgPiA1MCBvbiBodHRwXHJcblxyXG4gICAgICAgICAgICAgICAgalF1ZXJ5LmdldEpTT04oJy9nZW9jb2RlLmpzb24nLCBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2Vzcyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3Jkczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGF0aXR1ZGU6IGRhdGEubGF0aXR1ZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb25naXR1ZGU6IGRhdGEubG9uZ2l0dWRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKG9uU3VjY2Vzcywgb25FcnJvciwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtQWdlOiA1MDAwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogMjAwMDBcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25FcnJvcihlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChlcnJvci5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBlcnJvci5USU1FT1VUOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RpZmllci5hZGROb3RpZmljYXRpb24oJ2dlb2xvY2F0aW9uVGltZW91dCcsIDUwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIGVycm9yLlBFUk1JU1NJT05fREVOSUVEOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RpZmllci5hZGROb3RpZmljYXRpb24oJ2dlb2xvY2F0aW9uUGVybWlzc2lvbkRlbmllZCcsIDUwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIGVycm9yLlBPU0lUSU9OX1VOQVZBSUxBQkxFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RpZmllci5hZGROb3RpZmljYXRpb24oJ2dlb2xvY2F0aW9uUG9zaXRpb25VbmF2YWlsYWJsZScsIDUwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzKHBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAnaHR0cHM6Ly9ub21pbmF0aW0ub3BlbnN0cmVldG1hcC5vcmcvcmV2ZXJzZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6ICdqc29uJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgem9vbTogMTgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3NkZXRhaWxzOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXQ6IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9uOiBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICAgICAgICAgICAgfSkuZG9uZShmdW5jdGlvbiggZGF0YSApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaXR5ID0gZGF0YS5hZGRyZXNzLnZpbGxhZ2UgfHwgZGF0YS5hZGRyZXNzLnRvd24gfHwgZGF0YS5hZGRyZXNzLmNpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnYm9keScpLnByZXBlbmQoJzxpZnJhbWUgc3JjPVwiaHR0cHM6Ly80MjgyNTE3LmZscy5kb3VibGVjbGljay5uZXQvYWN0aXZpdHlpO3NyYz00MjgyNTE3O3R5cGU9dmJyX2UwO2NhdD1lbmdfZjAwO3U0PScgKyBkYXRhLmFkZHJlc3MucG9zdGNvZGUgKyAnO3UxMj0nICsgZGF0YS5hZGRyZXNzLmNvdW50cnkgKyAnO3UxMz0nICsgY2l0eSArICc7ZGNfbGF0PTtkY19yZGlkPTt0YWdfZm9yX2NoaWxkX2RpcmVjdGVkX3RyZWF0bWVudD07b3JkPScgKyBhICsgJz9cIiB3aWR0aD1cIjFcIiBoZWlnaHQ9XCIxXCIgZnJhbWVib3JkZXI9XCIwXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIj48L2lmcmFtZT4nKTtcclxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICQoJ1tkYXRhLWxmLXNlYXJjaC11cmxdJykuZGF0YSgnbGYtc2VhcmNoLXVybCcpICsgJz9sYXQ9JyArIHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSArICcmbG5nPScgKyBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGdldEJyb3dzZXIoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50LCB0ZW0sIE0gPSB1YS5tYXRjaCgvKG9wZXJhfGNocm9tZXxzYWZhcml8ZmlyZWZveHxtc2llfHRyaWRlbnQoPz1cXC8pKVxcLz9cXHMqKFxcZCspL2kpIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgaWYgKC90cmlkZW50L2kudGVzdChNWzFdKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbSA9IC9cXGJydlsgOl0rKFxcZCspL2cuZXhlYyh1YSkgfHwgW107XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtuYW1lOiAnSUUnLCB2ZXJzaW9uOiAodGVtWzFdIHx8ICcnKX07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoTVsxXSA9PT0gJ0Nocm9tZScpIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZW0gPSB1YS5tYXRjaCgvXFxiT1BSXFwvKFxcZCspLylcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGVtICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtuYW1lOiAnT3BlcmEnLCB2ZXJzaW9uOiB0ZW1bMV19O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIE0gPSBNWzJdID8gW01bMV0sIE1bMl1dIDogW25hdmlnYXRvci5hcHBOYW1lLCBuYXZpZ2F0b3IuYXBwVmVyc2lvbiwgJy0/J107XHJcbiAgICAgICAgICAgICAgICBpZiAoKHRlbSA9IHVhLm1hdGNoKC92ZXJzaW9uXFwvKFxcZCspL2kpKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTS5zcGxpY2UoMSwgMSwgdGVtWzFdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogTVswXSxcclxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBNWzFdXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8qIGpzaGludCBpZ25vcmU6ZW5kICovXHJcbiAgICAgICAgc2VhcmNoQmFyKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBob21lO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5jb25zdCBvdXRsZXQgPSB7XHJcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKGxpcXVpZHMpIHtcclxuXHJcbiAgICAgICAgbGlxdWlkcy5tYXAub3B0aW9ucy5kaXNhYmxlRGVmYXVsdFVJID0gdHJ1ZTtcclxuICAgICAgICAvLyBQdXQgaGVyZSBjdXN0b20gY2xpZW50IGNvZGUgZm9yIHRoZSBvdXRsZXQgcGFnZVxyXG4gICAgICAgIC8qanNoaW50IHVudXNlZDpmYWxzZSAqL1xyXG5cclxuICAgICAgICAkKCdbZGF0YS1sZi1vd2wtc21hcnQtdGFnLXNlcnZpY2VdJykub3dsQ2Fyb3VzZWwoe1xyXG4gICAgICAgICAgICBtYXJnaW46IDMwLFxyXG4gICAgICAgICAgICBsb29wOiB0cnVlLFxyXG4gICAgICAgICAgICByZXNwb25zaXZlQ2xhc3M6IHRydWUsXHJcbiAgICAgICAgICAgIGF1dG9wbGF5OiB0cnVlLFxyXG4gICAgICAgICAgICBhdXRvcGxheUhvdmVyUGF1c2U6IHRydWUsXHJcbiAgICAgICAgICAgIGF1dG9wbGF5VGltZW91dDogNTAwMCxcclxuICAgICAgICAgICAgc21hcnRTcGVlZDogNTAwLFxyXG4gICAgICAgICAgICBuYXY6IGZhbHNlLFxyXG4gICAgICAgICAgICByZXNwb25zaXZlOiB7XHJcbiAgICAgICAgICAgICAgICAwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IDEsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgNzY4OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IDIsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgOTkyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IDMsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJCgnW2RhdGEtbGYtb3dsLXNtYXJ0LXRhZy1wcm9kdWl0XScpLm93bENhcm91c2VsKHtcclxuICAgICAgICAgICAgbWFyZ2luOiAzMCxcclxuICAgICAgICAgICAgbG9vcDogdHJ1ZSxcclxuICAgICAgICAgICAgcmVzcG9uc2l2ZUNsYXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBhdXRvcGxheTogdHJ1ZSxcclxuICAgICAgICAgICAgYXV0b3BsYXlIb3ZlclBhdXNlOiB0cnVlLFxyXG4gICAgICAgICAgICBhdXRvcGxheVRpbWVvdXQ6IDUwMDAsXHJcbiAgICAgICAgICAgIHNtYXJ0U3BlZWQ6IDUwMCxcclxuICAgICAgICAgICAgbmF2OiBmYWxzZSxcclxuICAgICAgICAgICAgcmVzcG9uc2l2ZToge1xyXG4gICAgICAgICAgICAgICAgMDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiAxLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIDc2ODoge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiAyLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIDk5Mjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiAzLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vRnVuY3Rpb25zIHRvIFRvZ2dsZSBvdXRsZXQgaG91cnMgZGl2IGRlc2t0b3BcclxuICAgICAgICAkKCdbZGF0YS1sZi1vdmVybGF5LWJ0bl0nKS5jbGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHZhbCA9ICQodGhpcykuYXR0cignZGF0YS1sZi1vdmVybGF5LWJ0bicpO1xyXG4gICAgICAgICAgICB2YXIgaXNBY3RpdmUgPSAkKCdbZGF0YS1sZi1vdmVybGF5XVtkYXRhLWxmLScgKyB2YWwgKyAnLWNvbnRhaW5lcl0nKS5oYXNDbGFzcygnYWN0aXZlJyk7XHJcblxyXG4gICAgICAgICAgICAkKCdbZGF0YS1sZi1vdmVybGF5XScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxuXHJcbiAgICAgICAgICAgIGlmICgkKCdbZGF0YS1sZi1ob3Vycy1idG4tc2hvd10nKS5oYXNDbGFzcygnaGlkZGVuJykpIHtcclxuICAgICAgICAgICAgICAgICQoJ1tkYXRhLWxmLWhvdXJzLWJ0bi1oaWRlXScpLmFkZENsYXNzKCdoaWRkZW4nKTtcclxuICAgICAgICAgICAgICAgICQoJ1tkYXRhLWxmLWhvdXJzLWJ0bi1zaG93XScpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgJCgnW2RhdGEtbGYtb3ZlcmxheV1bZGF0YS1sZi0nICsgdmFsICsgJy1jb250YWluZXJdJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoJ1tkYXRhLWxmLWNhcm91c2VsLXBhdXNlZF0nKS5lYWNoKChpZCwgZWwpID0+IHtcclxuICAgICAgICAgICAgbGV0ICRlbCA9ICQoZWwpO1xyXG5cclxuICAgICAgICAgICAgaWYoJGVsLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgJGVsLmZpbmQoJy5jYXJvdXNlbC1pbm5lciAuaXRlbTpmaXJzdCwgLmNhcm91c2VsLWluZGljYXRvcnMgbGk6Zmlyc3QnKS5hZGRDbGFzcygnYWN0aXZlJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgJGVsLmNhcm91c2VsKHtcclxuICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICRlbC5oYW1tZXIoKS5vbignc3dpcGVsZWZ0JywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICRlbC5jYXJvdXNlbCgnbmV4dCcpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAkZWwuaGFtbWVyKCkub24oJ3N3aXBlcmlnaHQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGVsLmNhcm91c2VsKCdwcmV2Jyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICAkKCdbZGF0YS1sZi1ob3Vycy1idG4taGlkZV0sIFtkYXRhLWxmLWhvdXJzLWJ0bi1zaG93XScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCdbZGF0YS1sZi1ob3Vycy1idG4taGlkZV0sIFtkYXRhLWxmLWhvdXJzLWJ0bi1zaG93XScpLnRvZ2dsZUNsYXNzKCdoaWRkZW4nKTtcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgICQoJ1tkYXRhLWxmLW92ZXJsYXktY2xvc2VdJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJ1tkYXRhLWxmLW92ZXJsYXldJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkKCdbZGF0YS1sZi1tYXAtb3ZlcmxheV0nKS5jbGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoJ1tkYXRhLWxmLWxpbmtdJykuY2xpY2soZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XHJcbiAgICAgICAgICAgICAgICBzY3JvbGxUb3A6ICQoJCh0aGlzKS5hdHRyKCdocmVmJykpLm9mZnNldCgpLnRvcCAtICQoJyNvdXRsZXQtbmF2YmFyJykuaGVpZ2h0KClcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoJy5qcy1jb250YWN0LXVzJykuY2xpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAvLyBGaWd1cmUgb3V0IGVsZW1lbnQgdG8gc2Nyb2xsIHRvXHJcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKCcuY29tcG9uZW50cy1mb3JtLWNvbnRhY3QtYmFzaWMnKTtcclxuICAgICAgICAgICAgLy8gRG9lcyBhIHNjcm9sbCB0YXJnZXQgZXhpc3Q/XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHByZXZlbnQgZGVmYXVsdCBpZiBhbmltYXRpb24gaXMgYWN0dWFsbHkgZ29ubmEgaGFwcGVuXHJcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxyXG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gZnVuY3Rpb24gaW5pdFNlbGVjdChlbGVtZW50LCByZWZyZXNoKSB7XHJcbiAgICAgICAgLy8gICAgIHJlZnJlc2ggPSB0eXBlb2YgcmVmcmVzaCAhPT0gJ3VuZGVmaW5lZCcgPyByZWZyZXNoIDogZmFsc2U7XHJcbiAgICAgICAgLy8gICAgIGVsZW1lbnQuc2VsZWN0cGlja2VyKCdyZW5kZXInKTtcclxuICAgICAgICAvLyAgICAgaWYgKHJlZnJlc2gpIHtcclxuICAgICAgICAvLyAgICAgICAgIGVsZW1lbnQuc2VsZWN0cGlja2VyKCdyZWZyZXNoJyk7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgLy8gaW5pdFNlbGVjdCgkKCcuc2Zfc2VsZWN0JykpO1xyXG5cclxuICAgICAgICAkKCdmb3JtW2RhdGEtbGYtcG9zLWNvbnRhY3Rmb3JtXScpLmZvcm1WYWxpZGF0aW9uKHtcclxuICAgICAgICAgICAgZnJhbWV3b3JrOiAnYm9vdHN0cmFwJyxcclxuICAgICAgICAgICAgZXhjbHVkZWQ6ICc6ZGlzYWJsZWQnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoJ1tkYXRhLWxmLW5ld3NsZXR0ZXItYnV0dG9uXScpLmNsaWNrKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIGNvbnN0IGludGVyT3BlbiA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCQoJ2JvZHknKS5oYXNDbGFzcygnbW9kYWwtb3BlbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnYm9keScpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlck9wZW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaW50ZXJDbG9zZSA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCEkKCdib2R5JykuaGFzQ2xhc3MoJ21vZGFsLW9wZW4nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJ2JvZHknKS5hdHRyKCdhcmlhLWhpZGRlbicsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVyQ2xvc2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkKCcjY29udGFjdC1mb3JtLWxpbmsnKS5jbGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tY29udGFjdC11cycpLmZvY3VzKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoJ2Zvcm1bZGF0YS1sZi1wb3MtY29udGFjdGZvcm1dJykuc3VibWl0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAoISQoJ2Zvcm1bZGF0YS1sZi1wb3MtY29udGFjdGZvcm1dJykudmFsaWQpIHtcclxuICAgICAgICAgICAgICAgICQoJ2Zvcm1bZGF0YS1sZi1wb3MtY29udGFjdGZvcm1dIC5oYXMtZXJyb3InKS5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYXNFcnJvckVsID0gJCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBhc3NpZ25BcmlhT25TbWFsbChoYXNFcnJvckVsLCAnaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICBhc3NpZ25BcmlhT25TbWFsbChoYXNFcnJvckVsLCAnc2VsZWN0Jyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlbW92ZUFyaWFPblNtYWxsKCQoJ2Zvcm1bZGF0YS1sZi1wb3MtY29udGFjdGZvcm1dJyksICdpbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgcmVtb3ZlQXJpYU9uU21hbGwoJCgnZm9ybVtkYXRhLWxmLXBvcy1jb250YWN0Zm9ybV0nKSwgJ3NlbGVjdCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoJ2Zvcm1bZGF0YS1sZi1mb3JtLWFkZHJlc3NdJykuc3VibWl0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAoISQoJ2Zvcm1bZGF0YS1sZi1mb3JtLWFkZHJlc3NdJykudmFsaWQpIHtcclxuICAgICAgICAgICAgICAgICQoJ2Zvcm1bZGF0YS1sZi1mb3JtLWFkZHJlc3NdIC5oYXMtZXJyb3InKS5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYXNFcnJvckVsID0gJCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBhc3NpZ25BcmlhT25TbWFsbChoYXNFcnJvckVsLCAnaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICBhc3NpZ25BcmlhT25TbWFsbChoYXNFcnJvckVsLCAnc2VsZWN0Jyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlbW92ZUFyaWFPblNtYWxsKCQoJ2Zvcm1bZGF0YS1sZi1mb3JtLWFkZHJlc3NdJyksICdpbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgcmVtb3ZlQXJpYU9uU21hbGwoJCgnZm9ybVtkYXRhLWxmLWZvcm0tYWRkcmVzc10nKSwgJ3NlbGVjdCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGFzc2lnbkFyaWFPblNtYWxsKGVycm9yRGl2LCBlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBlbGVtZW50TGlzdCA9ICQoZXJyb3JEaXYpLmZpbmQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgIGVsZW1lbnRMaXN0LmVhY2goZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc21hbGwgPSAkKGVycm9yRGl2KS5maW5kKCdzbWFsbCcpO1xyXG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdhcmlhLWRlc2NyaWJlZGJ5JywgJCh0aGlzKS5hdHRyKCdkYXRhLWxmLWFyaWEtZGVzY3JpYmVkJykpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGFyaWFNZXNzYWdlRXJyb3IgPSAkKHRoaXMpLmF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKS5zcGxpdCgnICcpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNtYWxsLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxpZGl0eSA9ICQodGhpcykuYXR0cignZGF0YS1mdi1yZXN1bHQnKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3JUeXBlID0gJCh0aGlzKS5hdHRyKCdkYXRhLWZ2LXZhbGlkYXRvcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHZhbGlkaXR5ID09PSAnSU5WQUxJRCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yVHlwZSA9PT0gJ25vdEVtcHR5Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdpZCcsIGFyaWFNZXNzYWdlRXJyb3JbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdpZCcsIGFyaWFNZXNzYWdlRXJyb3JbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZUFyaWFPblNtYWxsKGZvcm0sIGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgdmFyIGVsZW1lbnRMaXN0ID0gZm9ybS5maW5kKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICBlbGVtZW50TGlzdC5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdhcmlhLWRlc2NyaWJlZGJ5JywgJycpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvY3VzTW9kYWwoJCgnI2xmLW9mZmVycy1vcGVucycpKTtcclxuICAgICAgICBmb2N1c01vZGFsKCQoJyNsZi1hZGRyZXNzLW9wZW5zJykpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBmb2N1c01vZGFsKGxpbmspIHtcclxuICAgICAgICAgICAgbGluay5jbGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICQoJ1tkYXRhLWxmLW1vZGFsLWNsb3NlLWJ1dHRvbl0nKS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgJCgnW2RhdGEtbGYtbW9kYWwtY2xvc2UtYnV0dG9uXScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmsuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vICQoJy5wb3Mtc2YtZm9ybSBpbnB1dFt0eXBlPXN1Ym1pdF0nKS5jbGljayhmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyAgICAgdmFyIHJlcyA9IHRydWU7XHJcbiAgICAgICAgLy8gICAgIHZhciBzZWxlY3RvciA9ICcucG9zLXNmLWZvcm0gc2VsZWN0W25hbWU9MDBOYjAwMDAwMDl3NWY3XSc7XHJcbiAgICAgICAgLy8gICAgIHNlbGVjdG9yICs9ICcsLnBvcy1zZi1mb3JtIHNlbGVjdFtuYW1lPTAwTmIwMDAwMDA5dzVlaV0nO1xyXG4gICAgICAgIC8vICAgICBzZWxlY3RvciArPSAnLCNsZWdhbF9kaXNjbGFpbWVyJztcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vICAgICAkKHNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgLy8gICAgICAgICB2YXIgcGFyZW50ID0gJCh0aGlzKS5wYXJlbnRzKCcuZm9ybS1ncm91cCcpO1xyXG4gICAgICAgIC8vICAgICAgICAgdmFyIGhlbHBCbG9jayA9ICQocGFyZW50KS5jaGlsZHJlbignLmhlbHAtYmxvY2snKTtcclxuICAgICAgICAvLyAgICAgICAgIGlmKCQodGhpcykudmFsKCkgPT09ICcnIHx8ICQodGhpcykudmFsKCkgPT09IG51bGwgfHwgISQodGhpcykuaXMoJzpjaGVja2VkJykpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICByZXMgPSBmYWxzZTtcclxuICAgICAgICAvLyAgICAgICAgICAgICBwYXJlbnQuYWRkQ2xhc3MoJ2hhcy1lcnJvcicpO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgICQoaGVscEJsb2NrKS5hdHRyKCdzdHlsZScsICcnKTtcclxuICAgICAgICAvLyAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgcGFyZW50LnJlbW92ZUNsYXNzKCdoYXMtZXJyb3InKTtcclxuICAgICAgICAvLyAgICAgICAgICAgICAkKGhlbHBCbG9jaykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgfSk7XHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyAgICAgaWYocmVzKSB7XHJcbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgb3V0bGV0O1xyXG5cclxuXHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmNvbnN0IHByb2R1Y3RDYXRlZ29yeSA9IHtcclxuICAgIGNyZWF0ZTogZnVuY3Rpb24obGlxdWlkcykge1xyXG4gICAgICAgIC8vIFB1dCBoZXJlIGN1c3RvbSBjbGllbnQgY29kZSBmb3IgdGhlIG91dGxldCBwYWdlXHJcbiAgICAgICAgLypqc2hpbnQgdW51c2VkOmZhbHNlICovXHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBwcm9kdWN0Q2F0ZWdvcnk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmNvbnN0IHByb2R1Y3QgPSB7XHJcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKGxpcXVpZHMpIHtcclxuICAgICAgICAvLyBQdXQgaGVyZSBjdXN0b20gY2xpZW50IGNvZGUgZm9yIHRoZSBvdXRsZXQgcGFnZVxyXG4gICAgICAgIC8qanNoaW50IHVudXNlZDpmYWxzZSAqL1xyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgcHJvZHVjdDtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5pbXBvcnQgc2VhcmNoQmFyIGZyb20gJy4uL3N0YXRpYy9zZWFyY2hCYXInO1xyXG5cclxuY29uc3Qgc2VhcmNoID0ge1xyXG4gICAgY3JlYXRlOiBmdW5jdGlvbihsaXF1aWRzKSB7XHJcbiAgICAgICAgLy8gUHV0IGhlcmUgY3VzdG9tIGNsaWVudCBjb2RlIGZvciB0aGUgc2VhcmNoIHBhZ2VcclxuICAgICAgICAvKmpzaGludCB1bnVzZWQ6ZmFsc2UgKi9cclxuXHJcbiAgICAgICAgc2VhcmNoQmFyKCk7XHJcblxyXG4gICAgICAgICQoJ1tkYXRhLWxmLW1vYmlsZS1zZWUtbWFwLWN1c3RvbV0nKS5vbignY2xpY2sga2V5dXAnLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAkKCcjc2VlLW1hcC1idXR0b24nKS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZnVuY3Rpb24oaW5kZXgsIGF0dHIpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF0dHIgPT09ICd0cnVlJyA/ICdmYWxzZScgOiAndHJ1ZSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJCgnW2RhdGEtbGYtbWFwLWFjdGl2ZWQtY3VzdG9tXScpLmF0dHIoJ2RhdGEtbGYtbWFwLWFjdGl2ZWQtY3VzdG9tJywgZnVuY3Rpb24oaW5kZXgsIGF0dHIpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF0dHIgPT09ICd0cnVlJyA/ICdmYWxzZScgOiAndHJ1ZSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCAkKCdbZGF0YS1sZi1tYXAtYWN0aXZlZC1jdXN0b21dJykuYXR0cignZGF0YS1sZi1tYXAtYWN0aXZlZC1jdXN0b20nKSA9PT0gJ3RydWUnICkge1xyXG4gICAgICAgICAgICAgICAgJCgnW2RhdGEtbGYtbWFwLWFjdGl2ZWQtY3VzdG9tXScpLnNjcm9sbFRvcCgwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkKCdbZGF0YS1sZi1tYXJrZXItaWRdJykuY2xpY2soZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnRJRCA9ICQodGhpcykuYXR0cignZGF0YS1sZi1tYXJrZXItaWQnKTtcclxuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgJCgnW2RhdGEtbGYtaW5mby13aW5kb3ddJykuYXR0cignYXJpYS1leHBhbmRlZCcsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgJCgnW2RhdGEtbGYtaW5mby13aW5kb3ctYnV0dG9uXScpLmZvY3VzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAkKCdbZGF0YS1sZi1pbmZvLXdpbmRvdy1idXR0b25dJykuY2xpY2soZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgLypqc2hpbnQgaWdub3JlOnN0YXJ0ICovXHJcblxyXG4gICAgICAgICAgICAgICAgICAgQnJpZGdlLnBhZ2VzLnNlYXJjaC5tYXAuaW5mb1dpbmRvdy5ib3guY2xvc2UoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAvKmpzaGludCBpZ25vcmU6ZW5kICovXHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICQoJ1tkYXRhLWxmLW1hcmtlci1pZF0nKS5lYWNoKCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5hdHRyKCdkYXRhLWxmLW1hcmtlci1pZCcpID09PSBjdXJyZW50SUQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH0sIDMwMCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICQoJ1tkYXRhLWxmLW1hcmtlci1pZF0nKS5rZXlwcmVzcyhmdW5jdGlvbihlKXtcclxuICAgICAgICAgICAgaWYoZS53aGljaCA9PT0gMTMpe1xyXG4gICAgICAgICAgICAgICAgJCgnW2RhdGEtbGYtbWFya2VyLWlkXScpLmNsaWNrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJCgnW2RhdGEtbGYtc2VhcmNoLWdlb2xvY2F0aW9uXScpLmNsaWNrKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIGlmICgkKCdbZGF0YS1sZi1ub3RpZmllci1saXN0XSA+IGRpdicpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICQoJ1tkYXRhLWxmLW5vdGlmaWVyLWxpc3RdJykuZmluZCgnZGl2JykucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgaW50ZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICgkKCdbZGF0YS1sZi1ub3RpZmllci1saXN0XSA+IGRpdicpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCdbZGF0YS1sZi1ub3RpZmllci1saXN0XScpLmZpbmQoJ2RpdicpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qanNoaW50IGlnbm9yZTpzdGFydCAqL1xyXG4gICAgICAgICAgICAgICAgICAgIEJyaWRnZS51aS5ub3RpZmllci5hZGROb3RpZmljYXRpb24oJ2dlb2xvY2F0aW9uUGVybWlzc2lvbkRlbmllZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qanNoaW50IGlnbm9yZTplbmQgKi9cclxuICAgICAgICAgICAgICAgICAgICAkKCdbZGF0YS1sZi1ub3RpZmllcl0nKS5hZGRDbGFzcygndmlzaWJsZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkKCdbIGRhdGEtbGYtbm90aWZpY2F0aW9uLWNsb3NlXScpLmNsaWNrKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCdbZGF0YS1sZi1ub3RpZmllcl0nKS5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xyXG4gICAgICAgICAgICAkKCdbZGF0YS1sZi1ub3RpZmllci1saXN0XScpLmZpbmQoJ2RpdicpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAkKCdbZGF0YS1sZi1ub3RpZmllcl0nKS5hdHRyKCdkYXRhLWxmLXZpc2libGUnLCBmYWxzZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBzZWFyY2g7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuLypqc2hpbnQgaWdub3JlOnN0YXJ0ICovXHJcbmZ1bmN0aW9uIGNhcGl0YWxpemVMZXR0ZXIoc3RyKSB7XHJcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1xcd1xcUyovZywgZnVuY3Rpb24gKHR4dCkge1xyXG4gICAgICAgIHJldHVybiB0eHQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0eHQuc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0VVJMUGFyYW1ldGVyKG5hbWUpIHtcclxuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoKG5ldyBSZWdFeHAoJ1s/fCZdJyArIG5hbWUgKyAnPScgKyAnKFteJjtdKz8pKCZ8I3w7fCQpJykuZXhlYyhsb2NhdGlvbi5zZWFyY2gpIHx8IFssICcnXSlbMV0ucmVwbGFjZSgvXFwrL2csICclMjAnKSkgfHwgbnVsbDtcclxufVxyXG5cclxuLy8gZnVuY3Rpb24gaW5pdFNlbGVjdChlbGVtZW50LCByZWZyZXNoKSB7XHJcbi8vICAgICByZWZyZXNoID0gdHlwZW9mIHJlZnJlc2ggIT09ICd1bmRlZmluZWQnID8gcmVmcmVzaCA6IGZhbHNlO1xyXG4vLyAgICAgZWxlbWVudC5zZWxlY3RwaWNrZXIoJ3JlbmRlcicpO1xyXG4vLyAgICAgaWYgKHJlZnJlc2gpIHtcclxuLy8gICAgICAgICBlbGVtZW50LnNlbGVjdHBpY2tlcigncmVmcmVzaCcpO1xyXG4vLyAgICAgfVxyXG4vLyB9XHJcblxyXG5mdW5jdGlvbiBwYXJzZUNpdGllcyhkYXRhLCBsb2NhbCkge1xyXG4gICAgdmFyIGNpdGllcyA9IFtdO1xyXG4gICAgdmFyIG9wdGlvbmNpdGllcyA9ICcnO1xyXG4gICAgLy9pZiBjb3VudHJ5IHNlbGVjdG9yIGlzIGFjdGl2ZVxyXG4gICAgaWYgKGxvY2FsKSB7XHJcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBkYXRhW2xvY2FsXS5sZW5ndGg7IGsrKykge1xyXG4gICAgICAgICAgICBjaXRpZXNba10gPSBjYXBpdGFsaXplTGV0dGVyKGRhdGFbbG9jYWxdW2tdKTtcclxuICAgICAgICAgICAgaWYgKGNpdGllc1trXSA9PT0gJ+W5v+W3nuW4gicpIHtcclxuICAgICAgICAgICAgICAgIGNpdGllc1trXSA9ICflub/lt54nOyAvLyByZXBsYWNlIGZvciBjaGluZXNlIGZyb250XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9hZGQgb3B0aW9ucyBmb3Igc2VsZWN0IGNpdGllc1xyXG4gICAgICAgICAgICBvcHRpb25jaXRpZXMgKz0gJzxvcHRpb24gaWQ9XCJjYjItb3B0JyArIChrKzEpICsnXCIgdmFsdWU9XCInICsgY2l0aWVzW2tdICsgJ1wiPicgKyBjaXRpZXNba10gKyAnPC9vcHRpb24+JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvL2lmIG5vdCB3ZSBkaXNwbGF5IGFsbCBjaXRpZXMgZnJvbSBhbGwgY291bnRyaWVzXHJcbiAgICBlbHNlIHtcclxuICAgICAgICB2YXIga2V5ID0gT2JqZWN0LmtleXMoZGF0YSk7XHJcbiAgICAgICAgdmFyIGMgPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZGF0YVtrZXlbaV1dLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBjaXRpZXNbY10gPSBjYXBpdGFsaXplTGV0dGVyKGRhdGFba2V5W2ldXVtqXSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2l0aWVzW2NdID09PSAn5bm/5bee5biCJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNpdGllc1tjXSA9ICflub/lt54nOyAvLyByZXBsYWNlIGZvciBjaGluZXNlIGZyb250XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBvcHRpb25jaXRpZXMgKz0gJzxvcHRpb24gaWQ9XCJjYjItb3B0JyArIChjKzEpICsnXCIgdmFsdWU9XCInICsgY2l0aWVzW2NdICsgJ1wiPicgKyBjaXRpZXNbY10gKyAnPC9vcHRpb24+JztcclxuICAgICAgICAgICAgICAgIGMrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgJCgnI3F1ZXJ5JykudHlwZWFoZWFkKHtcclxuICAgICAgICBzZWxlY3Rvcjoge1xyXG4gICAgICAgICAgICBkcm9wZG93bjogJ2Ryb3Bkb3duLW1lbnUgZHJvcGRvd24tbWVudS1yaWdodCcsXHJcbiAgICAgICAgICAgIGxpc3Q6ICdkcm9wZG93bi1tZW51JyxcclxuICAgICAgICAgICAgaGludDogJ2Zvcm0tY29udHJvbCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNvdXJjZToge1xyXG4gICAgICAgICAgICBkYXRhOiBjaXRpZXNcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8vIHNlbGVjdCBjaXRpZXMgYWRkIG9wdGlvbiBvcHRpb25jaXRpZXNcclxuICAgIHZhciAkc2VsZWN0Y2l0aWVzID0gJCgnI3F1ZXJ5Jyk7XHJcbiAgICAvLyByZW1vdmUgYWxsIG9wdGlvbnMgb2Ygc2VsZWN0XHJcbiAgICAkc2VsZWN0Y2l0aWVzLmh0bWwob3B0aW9uY2l0aWVzKTtcclxuXHJcbiAgICB2YXIgcXVlcnlDb2RlID0gZ2V0VVJMUGFyYW1ldGVyKCdxdWVyeScpO1xyXG4gICAgaWYgKHF1ZXJ5Q29kZSA9PSBudWxsKSB7XHJcbiAgICAgICAgJHNlbGVjdGNpdGllcy5maW5kKCdvcHRpb246ZXEoMCknKS5wcm9wKCdzZWxlY3RlZCcsIHRydWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAkc2VsZWN0Y2l0aWVzLmZpbmQoJ29wdGlvblt2YWx1ZT1cIicgKyBxdWVyeUNvZGUgKyAnXCJdJykucHJvcCgnc2VsZWN0ZWQnLCB0cnVlKTtcclxuICAgIH1cclxuICAgIC8vaW5pdFNlbGVjdCgkc2VsZWN0Y2l0aWVzLCB0cnVlKTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgKCkgPT4ge1xyXG4gICAgLy9pbml0IHNlbGVjdCBjaXRpZXMgI3F1ZXJ5XHJcbiAgICB2YXIgZGF0YUpzb247XHJcblxyXG4gICAgLy9TZXQgY291bnRyeSBhbmQgY2F0ZWdvcmllIHRvIHJlc2VhcmNoIHZhbHVlIChTdGFydClcclxuICAgIHZhciBjb3VudHJ5Q29kZSA9IGdldFVSTFBhcmFtZXRlcignY291bnRyeScpO1xyXG4gICAgdmFyICRjb3VudHJ5U2VsZWN0b3IgPSAkKCcjY291bnRyeScpO1xyXG5cclxuICAgIGlmIChjb3VudHJ5Q29kZSA9PSBudWxsKSB7XHJcbiAgICAgICAgJC5nZXRKU09OKCcvZ2VvY29kZS5qc29uJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgJGNvdW50cnlTZWxlY3Rvci5maW5kKCdvcHRpb25bdmFsdWU9JyArIGRhdGEuY291bnRyeV9jb2RlICsgJ10nKS5wcm9wKCdzZWxlY3RlZCcsIHRydWUpO1xyXG4gICAgICAgICAgICAvL2luaXRTZWxlY3QoJGNvdW50cnlTZWxlY3Rvcik7XHJcblxyXG4gICAgICAgICAgICB2YXIgbG9jYWxDb3VudHJ5ID0gJCgnI2NvdW50cnknKS52YWwoKTtcclxuXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgKyAnL2NpdGllcy5qc29uJyxcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YUpzb24gPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlQ2l0aWVzKGRhdGEsIGxvY2FsQ291bnRyeSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAkY291bnRyeVNlbGVjdG9yLmZpbmQoJ29wdGlvblt2YWx1ZT0nICsgY291bnRyeUNvZGUgKyAnXScpLnByb3AoJ3NlbGVjdGVkJywgdHJ1ZSk7XHJcblxyXG4gICAgICAgIC8vaW5pdFNlbGVjdCgkY291bnRyeVNlbGVjdG9yKTtcclxuXHJcbiAgICAgICAgdmFyIGxvY2FsQ291bnRyeSA9ICQoJyNjb3VudHJ5JykudmFsKCk7XHJcblxyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgIHVybDogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSArICcvY2l0aWVzLmpzb24nLFxyXG4gICAgICAgICAgICB0eXBlOiAnR0VUJyxcclxuICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGRhdGFKc29uID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIHBhcnNlQ2l0aWVzKGRhdGEsIGxvY2FsQ291bnRyeSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvL0F1dG9jb21wbGV0ZSAoU3RhcnQpXHJcbiAgICAkKCcjY291bnRyeScpLmNoYW5nZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGxvY2FsVXBkYXRlID0gJCgnI2NvdW50cnknKS52YWwoKTtcclxuICAgICAgICBwYXJzZUNpdGllcyhkYXRhSnNvbiwgbG9jYWxVcGRhdGUpO1xyXG4gICAgfSk7XHJcbn07XHJcbi8qanNoaW50IGlnbm9yZTplbmQgKi9cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24ocHJvdmlkZXIsIG9wdGlvbnMsIGtleSkge1xyXG5cclxuICAgIGxldCBJRExFID0gZmFsc2U7XHJcbiAgICBpZiAod2luZG93LkJyaWRnZS5wYWdlcy5vdXRsZXQubWFwKSB7XHJcbiAgICAgICAgbGV0IElOVCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAod2luZG93LkJyaWRnZS5wYWdlcy5vdXRsZXQubWFwLm1hcCkge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChJTlQpO1xyXG4gICAgICAgICAgICAgICAgd2luZG93LkJyaWRnZS5wYWdlcy5vdXRsZXQubWFwLm1hcC5hZGRMaXN0ZW5lcignaWRsZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghSURMRSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBJRExFID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5CcmlkZ2UucGFnZXMub3V0bGV0Lm1hcC5tYXAuc2V0T3B0aW9ucyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB6b29tQ29udHJvbDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBUeXBlQ29udHJvbDpmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVldFZpZXdDb250cm9sOmZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVsbHNjcmVlbkNvbnRyb2w6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdWxsc2NyZWVuQ29udHJvbE9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogZ29vZ2xlLm1hcHMuQ29udHJvbFBvc2l0aW9uLkJPVFRPTV9DRU5URVJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCAyMDApO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBtYXBDb25mID0gd2luZG93LkJyaWRnZS5tYXAuY29uZmlnW3Byb3ZpZGVyXShvcHRpb25zLCBrZXkpO1xyXG4gICAgbWFwQ29uZi5tYXAuc2Nyb2xsd2hlZWwgPSB0cnVlO1xyXG4gICAgcmV0dXJuIG1hcENvbmY7XHJcbn1cclxuIl19
