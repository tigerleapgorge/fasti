// Force directed Abstract Syntax Tree Interpreter Copyright Charles Li

(function () {
    "use strict";
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");
/*******                Data                     ******/

    var tokenArray = [];
    var ast = [];

/*******         Vector Library                      ******/
    function vector(x, y) {
        if ( !(this instanceof vector) ) { // dont need new
           var new_vec = new vector(x, y);
           return new_vec;
        }
        this.x = x || 0;
        this.y = y || 0;
    };

	vector.prototype.neg = function() {
		return new vector(this.x * -1, this.y * -1 );
	};

	vector.prototype.add = function(vecArg) {
        return new vector(this.x + vecArg.x, this.y + vecArg.y);
	};
    
	vector.prototype.subtract = function(v2) {
		return new vector(this.x - v2.x, this.y - v2.y);
	};

	vector.prototype.multiply = function(n) {
		return new vector(this.x * n, this.y * n);
	};
    
	vector.prototype.divide = function(n) {
		return new vector( (this.x / n) || 0,
                           (this.y / n) || 0);
	};
    
	vector.prototype.magnitude = function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};

	vector.prototype.magnitudeSquared = function() {
		return this.x * this.x + this.y * this.y;
	};
    
	vector.prototype.normalize = function() {
		return this.divide(this.magnitude());
	};

    var deltaRightVector = new vector(77,0);
    var deltaDownVector = new vector(0,77);

/*******                Graphics                      ******/
    function drawText(myStr, posVector){
        ctx.font = "25px Arial";
        ctx.fillStyle = "#0095DD";
        ctx.fillText(myStr, posVector.x-10, posVector.y+7);
    }

    function drawRect(position){
        //console.log("drawRect ", position);
        ctx.fillStyle = "green";
        ctx.fillRect(position.x, position.y, 20, 20);

    }
    
/*******                Parser                      ******/
    var categorize = function(curToken){
        if ( !isNaN(curToken) ) {
            return { type : "number" , value : parseFloat(curToken) };
        } else {
            return { type : "identifier", value : curToken };
        }
    }
    
    var parenthesize = function(tokenList) {
        var retArray = [];
        while( tokenList.length ) {
            var curToken = tokenList.shift();
            if(curToken === "(") { 
                retArray.push( { type : "expr" , value : "()", sexpr : parenthesize(tokenList) } ); // recursive
            } else if(curToken === ")") {
                return retArray;
            } else {
                retArray.push( categorize(curToken) );
                console.log("parenthesize ", retArray);
            }
        }
        return retArray;
    }

/*******                Library                      ******/
    var library = {
        "+" : function(x, y) {
            //  return x + y;
                var sum = 0;
                for(var i = 0; i < arguments.length; i++) {
                    sum += arguments[i];
                }
                return sum;
              }
    };
    
    var Context = function(scope, parent) {
        this.scope = scope;
        this.parent = parent;
        
        this.get = function(identifier){
          if (identifier in this.scope) {
              return this.scope[identifier];
          } else if (this.parent !== undefined) {
              return this.parent.get(identifier); // recursive to the top.
          }
        };
    };

/*******                Interpreter                      ******/
    var interpretList = function(input, context) {
        if (context === undefined) { // first time in, create primative library
            return interpretList(input, new Context(library) ); // Recurse -- load lib
        } else if (input[0].value === "if") { // special form
            input[1].result = interpret( input[1], context );
            // yield 
            if ( input[1].result ) { // Recurse
                input[2].result = interpret( input[2], context ); // Recurse consequence
                // yield
                return input[2].result;
            } else {
                input[3].result = interpret( input[3], context ); // Recurse alternative
                // yield
                return input[3].result;
            }
        } else if (input[0].value === "lambda") { // special form
            return function() { // RETURN A FUNCTION
                /*
                var lambdaArguments = arguments;
                var lambdaScope = input[1].sexpr.reduce( // construct new scope
                        function(acc, x, i) {
                            acc[x.value] = lambdaArguments[i];
                            return acc;
                            }, {}                      )
                var newContext = new Context(lambdaScope, context);
                return interpret(input[2], newContext); // Recurse
                */
                var formalArg = input[1].sexpr;
                var actualArg = arguments;
                var localEnv = {};
                for(var i = 0; i < arguments.length; i++) {
                    localEnv[formalArg[i].value] = actualArg[i]; // bind 
                }
                var localContext = new Context(localEnv, context); // chain it with previous Env
                return interpret(input[2], localContext); // Recurse
            }
        } else { // non-special form
            var list = input.map( // interpret every node in the list
                function(x) {
                    var map_res = interpret(x, context); // Recurse
                    return map_res; 
                }               );
            if (list[0] instanceof Function) { // apply JS function <========== THIS NEEDS TO CHANGE FOR GENERATOR
                return list[0].apply(undefined, list.slice(1)); // apply: each list element becomes an actual arg 
            } else {
                return list;
            }
        }
    };
    
    var interpret = function(input, context) {
        if (input.type === "expr") { // Expression
             input.result = interpretList(input.sexpr, context); // Recurse
             // yield
             return input.result;
        } else if (input.type === "identifier") { // Variable
            input.result = context.get(input.value);
            // yield
            return input.result;
        } else if (input.type === "number") { // Literal
            input.result = input.value;
            // yield
            return input.result;
        } else {
            console.log("Warning: interpret can not handle atom type", input.type);
        }
    };

/*******                Visualizer                      ******/
    var visualizeList = function(input, position) { // TODO: break up pos init from visualize
        var curPosition = position;
        for(var i = 0; i < input.length; i++){
            visualize(input[i], curPosition);
            curPosition = curPosition.add(deltaRightVector);
        }
        return;
    };

    var visualize = function(input, position) { // TODO: break up pos init from visualize
        if (position === undefined) {
            return visualize(input, new vector(canvas.width/5,  canvas.height/5) );
        } else if (input === undefined) {
            return;
        } else if (input instanceof Array) {
            visualizeList(input, position);
            return;
        } else {

            // Init Position, Velocity, Acceleration
            if (input.pos === undefined) {
                input.pos = new vector(position.x, position.y);
            }
            if (input.v === undefined) {
	            input.v = new vector(0,0);
            }
            if (input.a === undefined) {
                input.a = new vector(0,0);
            }

            drawRect(input.pos);
            drawText(input.value, input.pos);

            if (input.result !== undefined) {
                drawText(input.result, input.pos.add( new vector(0,22) ));
            }
            
            if (input.type === "expr") {
                visualizeList(input.sexpr, position.add(deltaDownVector) );
            }
            return;
        }
    };

// Position
    var timestep = 0.01; // Time Step -- super important
    var updatePosition = function(input) {
        input.pos = input.pos.add( input.v.multiply(timestep) ); // Update pos += v*t

        if(input.type === "expr") {
            updatePositionList(input.sexpr); // Recurse Sub-Expression
        }
    };
    var updatePositionList = function(input) {
        for(var i = 0; i < input.length; i++){
            updatePosition(input[i]);
        }
    };

// Velocity
    var damping = 0.9;
    var updateVelocity = function(input) {
        input.v = input.v.add( input.a.multiply(timestep) ); // Core

        input.v = input.v.multiply(damping); // damping
        input.a = input.a.multiply(damping); // ~2-3% surplus acceleration

        if(input.type === "expr") {
            updateVelocityList(input.sexpr); // Recurse Sub-Expression
        }
    };
    var updateVelocityList = function(input) {
        for(var i = 0; i < input.length; i++){
            updateVelocity(input[i]);
        }
    };

// Hooke's law: F = -kX
    var springLength = 77;
    var springConstant = 1; 
    var applySpring = function(inputA, inputB) {
        var d = inputB.pos.subtract(inputA.pos);
        var displacement = d.magnitude() - springLength;
        var direction = d.normalize();

        var delta_a = direction.multiply(springConstant * displacement * 0.5 )

        inputA.a = inputA.a.add( delta_a );       // core
        inputB.a = inputB.a.add( delta_a.neg() ); // core
    };
    var springList = function(input, parent) {
        if(parent !== undefined){ // firest entry no parent
            for(var i = 0; i < input.length; i++) {
                applySpring(input[i], parent); // apply spring from parent to each child
            }
        }

        for(var i = 1; i < input.length; i++) {
            applySpring(input[i-1], input[i-0]); // horizontal spring between children
        }
            
        for(var i = 0; i < input.length; i++) {
            if (input[i].type === "expr") {
                springList(input[i].sexpr, input[i]); // Recurse - remember parent
            }
        }
    };


// Coulomb's law: F = k q1 q2 / r^2
    var chargeConstant = 50000; // k
    var applyRepulsion = function(inputA, inputB){
        var distance = inputB.pos.subtract(inputA.pos); // TODO: when input1 and input2 pos overlap
        var distance_magSquared = distance.magnitudeSquared(); // denominator
        var direction = distance.normalize(); // unit length

        var delta_acc = direction.multiply(0.5 * chargeConstant / (distance_magSquared + 50 ) ) 
        inputA.a = inputA.a.add( delta_acc.neg() );  // Apply acceleration to A
        inputB.a = inputB.a.add( delta_acc );        // Apply acceleration to B
        return;
    }
    var repelAtom = function(input, other) { // other holds first time transversal input
        if(other === undefined) {  // 1st transveral 
            repelList(ast, input); // transverse AST again for each node - O(N^2)
        } else { // 2nd transversal - other holds current node
            if(input !== other){
                applyRepulsion(input, other); // apply electrostatic force
            }
        }

        if(input.type === "expr") {
            repelList(input.sexpr, other); // recurse
        }
    };
    var repelList = function(input, other) {
        for(var i = 0; i < input.length; i++){
            repelAtom(input[i], other);
        }

    };

/*******                Main                ******/    
/*******                Main                ******/
/*******                Main                ******/

    function main(){
        var sourceCode = "( ( lambda ( a b c ) (+ a ( + b c) ) ) 1 2 3 )";
        //var sourceCode = "( ( lambda (x) x ) 3 )";
        //var sourceCode = "(+ 3 5)";
        //var sourceCode = "(1 2 3)";

        tokenArray = sourceCode.replace(/\(/g, " ( ")
                               .replace(/\)/g, " ) ")
                               .trim()
                               .split(/\s+/);
        ast = parenthesize(tokenArray);

        var maxFrame = 1; // <= number of Frames before Visualization stops

        var frame = 0;
        var drawCall = function() { // core
           
            if(frame > maxFrame) { // 1st Method - Stop
                window.clearInterval(drawIntervalID);
            }
            
            console.log("drawCall", frame++); // top left frames
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
            drawText("Frame: " + frame, {x:30, y:30}); // frame counter upper left

            visualize(ast); // init p,v,a and draw
            springList(ast); // O(N)
            repelList(ast);  // O(N^2)
            updatePositionList(ast);
            updateVelocityList(ast);

            /*
            if(frame < maxFrame) { // 2nd Method - Stop
                window.requestAnimationFrame(drawCall);
            }
            */
            return;
        }

        var drawIntervalID = window.setInterval(drawCall, 5); // 1st Method Start (2nd arg in millisecond)
        //drawCall(); // 2nd Method - Start

        var final_res = interpretList(ast); // core - start with array
        console.log(">>> Final Result: ", final_res);


        // var gen = interpretList(ast);
        // gen.next();

        return;
    }

    document.addEventListener('DOMContentLoaded', main, false); // start when ready
})   ();
