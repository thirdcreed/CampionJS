


var CP, campion;

(function () {

    campion = CP = function (nameSpace) {
        return new Campion(nameSpace);
    };

    var Campion = function (nameSpace) {
        var _self = this;
        this.variables = {};
        this.arrays = [];
        this.matrices = {};
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
            '<': function (a, b) {
                
               
            },
            '=': function(a, b) {
                
                if (typeof b == "number") {
                    a.domain.reset();
                    console.log("a", a);
                    a.domain.set(b, true);
                    }

            },
            '!=': function (a, b) {



               // console.log("a, b", a.domain.toString(), b.domain.toString());
                if (b.domain.count() == 1) {
                    if (!_self.narrow(a, b.domain.copy().not())) {
                       // console.log("" + a.name + " narrowed " + b.name + " to zero sum :(");
                        return false;
                    }
                    
                }


                if (a.domain.count() == 1) {
                    if (!_self.narrow(b, a.domain.copy().not())) {
                       // console.log("" + b.name + " narrowed " + a.name + " to zero sum :(");
                        return false;
                    }
                    
                }
                return true;
            },
            '<=': function () { },
            '>=': function () { }

        };

        this.buildDomain = function (domainArray) {
            var newArray = domainArray;

            for (var i = 0; i < domainArray.length; i++) {
                newArray[i] = _.range(newArray[i][0], newArray[i][1] + 1);
               
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
                
                if (v != 'lastFrame' && this.variables[v].domain.count() != 1) {
                    return false;
                }
            }

           
            return true;
        };


        this.solveOne = function () {
         //   console.log("ENTER SOLVE ONE");

           
            if (this.isFixedPoint(this.variables)) {

               for (var v in this.variables) {
                  console.log("VAR:",v,"VALUE:",this.variables[v].domain.toString());
                 
               }
                throw new Error("YES!!!!");
                return true;
            } else {
                var frame = this.undoStack.length();
                //console.log("frame:",frame);
                this.undoStack.currentFrame = frame;

                 v = _.find(this.variables, function (variable) {
                  
                    return variable.domain.count() > 1;
                });


                 for (var i = 0; i < v.domain.size() ; i++) {
                    // console.log("try value "+i +" for "+ v);
                    if (v.domain.get(i)) {

                        var newArr = new BitArray(v.domain.size());
                        newArr.set(i, true);


                        if (!this.narrow(v, newArr)) {
                           // console.log('narrow returned false');
                            return

                        } else {
                            
                            if (!this.solveOne()) {
                               // console.log("solveOne() failed");
                               
                            } //return codes for back jumping
                        }

                        //return codes for back jumping

                       // console.log("got to the undo stack with frame of:", frame, ",length of", this.undoStack.length(), "and currentFrame of", this.undoStack.currentFrame);
                        while (this.undoStack.length() != frame) {
                            var pair = this.undoStack.pop();
                          //  console.log("pair.variable pair.values", pair.variable,pair.values.toString());
                            pair.variable.domain = pair.values.copy();
                        }
                        this.undoStack.currentFrame = frame;
                        
                    }
                     //
                 }
                 return true;
            }


        };

        this.narrow = function (v, set) {
            //console.log("ENTER NARROW with v of", v);
           // console.log("Narrowed from:",v.domain.toString());
            var newSet = v.domain.copy().and(set);
           // console.log("Narrowed to:", newSet.toString());
            
           
            if (newSet.count() === 0) {
                console.log("EMPTY SET");
                //throw new Error("FAILURE!!!").stack;
                return false;
            }
           // console.log("!newSet.equals(v.domain)", !newSet.equals(v.domain));
            if (!newSet.equals(v.domain)) {

               // console.log("lastFrame", v.lastFrame, " == currentFrame", this.undoStack.currentFrame);
               if (v.lastFrame <= this.undoStack.currentFrame) {

                   // console.log("onPush", this.undoStack);
                   
                        this.undoStack.push( v, v.domain );
                    
                    v.lastFrame = this.undoStack.currentFrame;
                }
                v.domain = newSet.copy();
                //console.log("yup");
                
                for (var c in v.constraints) {

                    if (!this.propagate(v.constraints[c], v)) {
                        console.log("variable " + v + " was narrowed to empty set");
                        return false;
                    }
                }

            }
            
            return true;
        };

        this.propagate = function(constraint, variable) {
           // console.log("ENTER PROPAGATE");
            if (constraint.variables[1] != variable && constraint.variables[1] != undefined) {

                if (!constraint.OP.apply(null, constraint.variables)) {

                    return false;
                }
            }
          //  console.log("returning true");
            return true;

            //return code;

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
                    domain: domainSet.copy(),
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
            

            var tokens = exp.split(/(\s)+/);
            console.log("TOKENS", tokens);
            for (var i = 0, l = tokens.length; i < l; i++) {

                if (/[\+\-\*\/\>\=\!<]+/.test(tokens[i])) {
                    constraint['OP'] = this.operators[tokens[i]];
                }
                if (/[\w_]/.test(tokens[i])) {
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
        },
        
        getVariable: function(name) {
            return this.variables[name];

        },
        getMatrix: function(name) {
            return this.matrices[name];
        },
        
        addMatrix: function(varName,m,n,dom) {

            var argsArray = Array.prototype.slice.apply(arguments);
            argsArray = argsArray.slice(3);
            this.matrices[varName] = [];
            var domainSet = this.buildDomain(argsArray);
            for (var i = 0; i < m; i++) {
                this.matrices[varName][i] = [];
                for (var j = 0; j < n; j++) {
                    this.variables[varName + i + "_" + j] = {
                        name: varName + i + "_" + j,
                        domain: domainSet.copy(),
                        constraints: [],
                        lastFrame: 0
                    };
                    this.matrices[varName][i][j] = varName + i + "_" + j;
                }
            }
            return this;

        },
        
        allDifferent: function(arrayOfStrings) {

            var l = arrayOfStrings.length - 1;
            for (var i = 0; i < l; i++) {
                for (var k = 1; k < l; ++k) {
                    if (i + k < l) {
                        console.log('ALLDIFFERENT:', arrayOfStrings[i] + " != " + arrayOfStrings[i + k]);
                        this.addConstraint(arrayOfStrings[i] + " != " + arrayOfStrings[i + k]);
                    }
                }
                
            }

        }


    };

}());


/*
var blah = CP("pairwiseDifference")
    .addVars("Q", 10, [0,10 ])
    .buildConstraint()
    .forAll("Q") //Allows cp to know this is an array.
    .suchThat("Q[i]")
    .notEqual()
    .to("Q[i + 1]")
    .buildConstraint()
    .forAll("Q") //Allows cp to know this is an array.
    .suchThat("Q[i]")
    .notEqual()
    .to("Q[i + 2]")
    .addVar("A", [1, 100]);

blah.solve();
*/

var Sudoku = CP("Sudoku")
    .addMatrix("board", 9, 9, [1, 9]);

var matrix = Sudoku.getMatrix("board");
console.log(matrix,matrix.length);
var m = matrix.length - 1;
var n = matrix[0].length - 1;

//addMatrixConstriants(matrix,m,n).done(solve());
Sudoku.addConstraint("board0_3 = 5");
Sudoku.addConstraint("board0_4 = 9");
Sudoku.addConstraint("board0_6 = 8");
Sudoku.addConstraint("board0_8 = 1");
Sudoku.addConstraint("board1_1 = 4");
Sudoku.addConstraint("board1_2 = 6");
Sudoku.addConstraint("board1_4 = 3");
Sudoku.addConstraint("board1_5 = 7");
Sudoku.addConstraint("board2_0 = 5");
Sudoku.addConstraint("board2_4 = 1");
Sudoku.addConstraint("board2_7 = 7");
Sudoku.addConstraint("board3_0 = 7");
Sudoku.addConstraint("board3_2 = 4");
Sudoku.addConstraint("board3_3 = 1");
Sudoku.addConstraint("board3_8 = 9");
Sudoku.addConstraint("board4_0 = 6");
Sudoku.addConstraint("board4_3 = 9");
Sudoku.addConstraint("board4_5 = 3");
Sudoku.addConstraint("board4_8 = 7");
Sudoku.addConstraint("board5_0 = 2");
Sudoku.addConstraint("board5_5 = 5");
Sudoku.addConstraint("board5_6 = 1");
Sudoku.addConstraint("board5_8 = 6");
Sudoku.addConstraint("board6_1 = 1");
Sudoku.addConstraint("board6_4 = 6");
Sudoku.addConstraint("board6_8 = 4");
Sudoku.addConstraint("board7_3 = 7");
Sudoku.addConstraint("board7_4 = 5");
Sudoku.addConstraint("board7_6 = 9");
Sudoku.addConstraint("board7_7 = 3");
Sudoku.addConstraint("board8_0 = 9");
Sudoku.addConstraint("board8_2 = 5");
Sudoku.addConstraint("board8_3 = 3");
Sudoku.addConstraint("board8_4 = 4");
Sudoku.addConstraint("board8_5 = 8");

//var addMatrixConstriants = function(matrix, m, n) {
    for (var i = 0; i < m; i++) {
       // console.log("i!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", i);
        for (var j = 0; j < n; j++) {
            for (var k = 1; k < n; k++) {
               // console.log(k);
               

                if (i + k < 9) {
                    Sudoku.addConstraint(matrix[i][j] + " != " + matrix[i + k][j]);
                }
                
                if (j + k < 9) {
                    Sudoku.addConstraint(matrix[i][j] + " != " + matrix[i][j + k]);
                }


            }
        }

    }
    

    
    for (i = 0; i < 3; ++i) {
        for (j = 0; j < 3; ++j) {
            var difArray = [];
            for (i2 = 0; i2 < 3; ++i2) {
                for (j2 = 0; j2 < 3; ++j2) {
                    console.log("squares:",matrix[i * 3 + i2][j * 3 + j2]);
                        difArray.push(matrix[i * 3 + i2][j * 3 + j2]);
                    
                }
            }
            Sudoku.allDifferent(difArray);

        }
    }


   
    
    
    
    
    
    
  /*  for (var i = 0; i < m; i++) {
       // console.log("i!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", i);
        for (var j = 0; j < n; j++) {
            for (var k = 1; k < n; k++) {
               // console.log(k);
               
                


            }
        }

    }*/


    $('#info').button().click(function () { Sudoku.solve(); });
    //Sudoku.solve();
    
//};





    



