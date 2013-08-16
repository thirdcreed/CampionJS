﻿
///////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
////////////////////CAMPION/////////////////////////////////
///////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////


var CP, campion;

(function () {

    campion = CP = function (nameSpace) {
        return new Campion(nameSpace);
    };

    var Campion = function (nameSpace) {
        var _self = this;
        this.variables = {};
        this.space = nameSpace;
        this.constraints = [];
        this.operators = {};
        
        this.undoStack = {
            stack: [],
            length: function () {
                return this.stack.length;
            },
            currentFrame: 0,
            push: function (variable, values) {
                this.stack.push({
                    variable: variable,
                    values: values
                });
            },
            pop: function () {
                return this.stack.pop();
            }
        };

        this.operators = {
            '+': function () { },
            '-': function () { },
            '*': function () { },
            '/': function () { },
            '>': function () { },
            '<': function () {
                console.log("I am less than");
            },
            '=': function () { },
            '!=': function (a, b) {


             console.log("a and a not".domain.toString(), a.domain.not().toString());
              
                
                
                if (!_self.narrow(a, b.domain.not())) {
                    
                    return false;
                };
                if (!_self.narrow(b, a.domain.not())) {
                    return false;
                };
                return true;
            },
            '<=': function () { },
            '>=': function () { }

        };

        this.buildDomain = function (domainArray) {
            var newArray = domainArray;

            for (var i = 0; i < domainArray.length; i++) {
                newArray[i] = _.range(newArray[i][0], newArray[i][1] + 1);
                console.log("newArray[i]", newArray[i]);
            }
            var newerArray = _.union.apply(_, newArray);
            var bitArray = new BitArray(newerArray[-1]);
            _.each(newerArray, function (e) {
                bitArray.set(e, true);
            });

            return bitArray;
        };

        this.isFixedPoint = function(sysVariables) {
            

            if (!sysVariables) {

                return false;
            }

            for (var v in sysVariables) {
                
                if (v != 'lastFrame' && this.variables[v].domain.count() > 1) {
                    return false;
                }
            }

           
            return true;
        };


        this.solveOne = function () {


           
            if (this.isFixedPoint(this.variables)) {

               for (v in this.variables) {
                   console.log("VAR:",v,"VALUE:",this.variables[v].domain.toString());

               }
                return true;
            } else {
                var frame = this.undoStack.length();
                this.undoStack.currentFrame = frame;

                var v = _.find(this.variables, function (variable) {
                  
                    return variable.domain.count() > 1;
                });


                for (var i = 0; i < v.domain.size() ; i++) {
                    if (v.domain.get(i)) {

                        var newArr = new BitArray(v.domain.size());
                        newArr.set(i, true);
                        
                        
                         if (!this.narrow(v, newArr)) {
                             console.log('returned false');
                            return;
                        } //return codes for back jumping
                       
                        if (!this.solveOne()) {
                           return;
                        }; //return codes for back jumping
                       
                        while (this.undoStack.length() != frame) {
                            var pair = undoStack.pop();
                            
                            pair.variable.domain = pair.values;
                        }
                        this.undoStack.currentFrame = frame;

                    }
                }
            }


        };

        this.narrow = function (v, set) {
            console.log("Narrowed from:",v.domain.toString());
            var newSet = v.domain.and(set);
            console.log("Narrowed to:",newSet.toString());
           
            if (newSet.count() === 0) {
                console.log("FAIL!!!");
                
                
                
                return false;
            }
           
            if (!newSet.equals(v.domain)) {
               
                
                if (v.lastFrame == this.undoStack.currentFrame) {
                    
                    
                    this.undoStack.push(v, v.domain);
                    v.lastFrame = this.undoStack.currentFrame;
                }
                v.domain = newSet;
                
                for (var c in v.constraints) {

                    if (!this.propagate(v.constraints[c], v)) {
                        return false;
                    }
                }
               

            }
            
            return true;
        };

        this.propagate = function (constraint, variable) {
           
            if (!constraint.OP.apply(null, constraint.variables)) {
               
                return false;
            };//return code;

        };

        return this;
    };

    function ConstraintBuilder(CP) {
        
        var _self = this;
        _self.arrayVar = "";
        _self.leftVar = "";
        _self.rightVar = "";
        _self.operator =  "";
        _self.isArrayConstraint = false;

        var buildConstraint = function () {
            return _self.isArrayConstraint ? buildArrayConstraint() : buildSingleConstraint();
        };

        var buildSingleConstraint = function () {
            CP.addConstraint(_self.leftVar + " " + _self.operator + " " + _self.rightVar);
        };

        var buildArrayConstraint = function () {
            var actualArray = _.filter(CP.variables, function (v) { return v.name.indexOf(_self.arrayVar) == 0; });
            var leftAccessor = _self.leftVar.match(/[^[\]]+(?=])/g)[0];
            var rightAccessor = _self.rightVar.match(/[^[\]]+(?=])/g)[0];
            for (var i = 0, l = actualArray.length; i < l; i++) {
                var left = eval(leftAccessor);
                var right = eval(rightAccessor);
                if(right > l){ break; }
                CP.addConstraint(_self.arrayVar + left + " " + _self.operator + " " + _self.arrayVar + right);
            }
        };

        _self.forAll = function (varName) {
            _self.arrayVar = varName;
            _self.isArrayConstraint = true;
            return this;
        };
        _self.suchThat = function (varName) {
            _self.leftVar = varName;
            return this;
        };
        _self.notEqual = function () {
            _self.operator = "!=";
            return this;
        };
        _self.to = function (varName) {
            _self.rightVar = varName;
            buildConstraint();
            return CP;
        };
    }

    //PROTOTYPE

    campion.fn = Campion.prototype = {
        // API Methods
        addVar: function (varName, varDomain) {
            var argsArray = Array.prototype.slice.apply(arguments);
            argsArray = argsArray.slice(1);

            var domainSet = this.buildDomain(argsArray);

            this.variables[varName] = {
                name: varName,
                domain: domainSet,
                constraints: [],
                lastFrame: 0
            };

            return this;
        },

        addVars: function (varName, length) {
            var argsArray = Array.prototype.slice.apply(arguments);
            argsArray = argsArray.slice(2);

            var domainSet = this.buildDomain(argsArray);
            for (var i = 0; i <= length; i++) {
                this.variables[varName + i] = {
                    name: varName + i,
                    domain: domainSet,
                    constraints: [],
                    lastFrame: 0
                };
            }
            return this;
        },

        addConstraint: function (exp) {
            var constraint = {};
            var scheme = [];
            // var binary = (arguments[2] != null);
            // var unary = !binary;

            // if (!binary) {
            console.log(this);

            var tokens = exp.split(/(\s)+/);
            console.log("TOKENS", tokens);
            for (var i = 0, l = tokens.length; i < l; i++) {

                if (/[\+\-\*\/\>\=\!<]+/.test(tokens[i])) {
                    constraint['OP'] = this.operators[tokens[i]];
                }
                if (/\w/.test(tokens[i])) {
                    console.log("exp[i]", tokens[i]);
                    if (this.variables[tokens[i]]) {
                        scheme.push(this.variables[tokens[i]]);
                    }
                }
            }
            constraint["variables"] = scheme;

            for (var v in scheme) {
                scheme[v]['constraints'].push(constraint);
            }

            //  }

            return this;

        },

        solve: function () {
            console.log("CALLED IN SOLVE:", this.variables);
            this.solveOne();
        },
        printVars: function () {

            for (var i in this.variables) {
                console.log(this.variables[i], " : ", this.domains[i].toString(), this.constraintsOfVar[i]);
            }
        },
        
        buildConstraint: function () {
            
        return new ConstraintBuilder(this);
    }


    };

}());



var blah = CP("pairwiseDifference")
    .addVars("Q", 3, [0, 10])
    .buildConstraint()
        .forAll("Q") //Allows cp to know this is an array.
        .suchThat("Q[i]")
        .notEqual()
        .to("Q[i + 1]");

blah.solve();