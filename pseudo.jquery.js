/**
  * jQuery plugin to provide an interface to manipulating CSS of 
  * pseudo elements
  * 
  * https://github.com/markwatkinson/jquery-pseudo-css
  */

(function($) {
    "use strict";
    var uidCounter = 0,
        ruleIndexCounter = 0,
        /// stylesheet object which we'll write our rules into
        styleSheet = null,
        styleSheetLoaded = false;
        
    /***********************************
     * MISC UTILITY FUNCTIONS
     ***********************************/
    function isObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
    function isString(value) {
        return typeof value === 'string';
    }
    function isUndefined(value) {
        return typeof value === 'undefined';
    }
    /*
     * Unwraps a function or a string
     * i.e. if the given value is a string, it's returned. 
     * if it's a function, the function is evaluated, and its result
     * returned
     */
    function unwrap(stringOrFunc, context) {
        if (isString(stringOrFunc)) {
            return stringOrFunc;
        }
        else if (typeof stringOrFunc === 'function') {
            return stringOrFunc.call(context);
        }
        else {
            // technically this is an error but cast whatever it is
            // to a string so it might still work.
            return '' + stringOrFunc;
        }
    }

    /**
      * Converts anExampleString from camel case to 
      * CSS style an-example-string
      */
    function unCamelCase(string) {
        return string.replace(/[A-Z]/g, function($0) {
            return '-' + $0.toLowerCase();
        });
    }
    /**
      * Camel cases a css style string 
      */
    function camelCase(string) {
        return string.replace(/-([a-z]?)/g, function($0, $1) {
            return $1? $1.toUpperCase() : '';
        });
    }
    
    /*************************************************
     * Domain logic
     *************************************************/

    /**
      * Loads our stylesheet if it has not already been loaded
      */
    function loadStyleSheet() {
        if (styleSheetLoaded) { return; }
        $('head').append(document.createElement('style'));
        styleSheet = document.styleSheets[document.styleSheets.length-1];
        styleSheetLoaded = true;
    }
    
    
    function getData($element) {
        return $element.data('pseudoCss') || {};
    }
    function saveData($element, data) {
        $element.data('pseudoCss', data);
    }
    function getOptions($element, pseudoElement) {
        var data = getData($element),
            options = data.css[pseudoElement];
    }
    
    function setupElement($element) {
        var data = getData($element);
        if (data.setup) { return; }
        if (!$element.attr('id')) {
            $element.attr('id','pseudoCssId' + uidCounter);
        }        
        data.setup = true;
        data.css = {};
        saveData($element, data);
    }
    
    function setupPseudoElement($element, pseudoElement) {
        var data;
        setupElement($element);
        data = getData($element);
        if (typeof data.css[pseudoElement] === 'undefined') {
            // nothing's been created yet
            data.css[pseudoElement] = {
                index:  ruleIndexCounter++,
                rules : {},
                selector : function() {
                    return '#' + $(this).attr('id');
                },
                useImportant: true
            }
            saveData($element, data);
        }
    }
    
    /**
      * Writes the element's CSS properties out.
      */
    function writeCssToStyleSheet($element, pseudoElement) {
        var data = getData($element), 
            index = data.css[pseudoElement].index,
            cssMap = data.css[pseudoElement].rules,
            selector_ = data.css[pseudoElement].selector,
            useImportant = data.css[pseudoElement].useImportant,
            selectorFragment = unwrap(selector_, $element.get(0)),
            selector, ruleBody;
        
        selector = selectorFragment + pseudoElement;
        ruleBody = '';
        $.each(cssMap, function(property, value) {
            if (value) {
                ruleBody += unCamelCase(property) + ':' + value;
                if (useImportant) {
                    ruleBody += '!important';
                }
                ruleBody += ';';
            }
        });
        
        if (styleSheet.insertRule) {
            // we can't have a sparse array so fill up any discrepancy with
            // no-ops
            while ( styleSheet.cssRules.length <= index) {
                styleSheet.insertRule('#null {}', styleSheet.cssRules.length);
            }
            styleSheet.insertRule(selector + '{' + ruleBody + '}', index);
        }       
        if (styleSheet.deleteRule && index+1 < styleSheet.cssRules.length) {
            styleSheet.deleteRule(index+1);
        }
    }
    
    function setPseudoElementCss($element, pseudoElement, cssMap) {
        var data = getData($element),
            existing;
        
        setupPseudoElement($element, pseudoElement);
        $.extend(data.css[pseudoElement].rules, cssMap);
        saveData($element, data);
        writeCssToStyleSheet($element, pseudoElement);
    }
    
    /**
      * Encodes our map to camel casing, for 
      * consistency 
      */
    function translateMapSyntax(map) {
        var m = {};
        $.each(map, function(key, val) {
            m[camelCase(key)] = val;
        });
        return m;
    }
    
    
    
    /**
      * Options is an object in the form: {
          pseudoElement: {
              selector = '#some-selector' OR function,
              useImportant: true
          }
      }
      */
    $.fn.pseudoCssOptions = function(params) {
        var $this = $(this),
            data;
        
        if (isObject(params)) {
            return $this.each(function() {
                var $e = $(this);
                $.each(params, function(pseudoElement, map) {
                  setupPseudoElement($e, pseudoElement);
                  data = getData($e);
                  data.css[pseudoElement] = $.extend(data.css[pseudoElement],
                    map, true);
                  saveData($e, data);
                });
            });
        }
        else if (isString(params)) {
            setupPseudoElement($this, params);
            return getData($this).css[params];
        }
        else {
            return $this;
        }
    };
    
    $.fn.pseudoCss = function(pseudoElement, propertyOrObject, value) {
        // fit the prop/value into an object so we know what we're doing
        var propertyValueMap = {};

        if (isObject(propertyOrObject)) {
            // we're good
            propertyValueMap = propertyOrObject;
        } else {
            propertyValueMap[propertyOrObject] = value;
        }
        
        propertyValueMap = translateMapSyntax(propertyValueMap);
        
        return $(this).each(function() {
            setupElement($(this));
            setPseudoElementCss($(this), pseudoElement, propertyValueMap);
        });
    };


    $(document).ready(loadStyleSheet);
}(jQuery));
