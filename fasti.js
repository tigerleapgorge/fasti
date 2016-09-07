// FASTI: Force-directed Abstract Syntax Tree Interpreter 
// Copyright (C) 2016 Charles Li

(function () {
    "use strict";
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");

/*******         Global Data                        ******/
    var tokenArray = [];
    var ast = [];




    var deltaRightVector = new vector(50,0);
    var deltaDownVector = new vector(0,50);

/*******                Graphics                      ******/
    var drawText = function(myStr, posVector) {
        ctx.font = "20px Arial";
        ctx.fillStyle = "OrangeRed";  // http://www.w3schools.com/cssref/css_colors.asp
        ctx.fillText(myStr, posVector.x, posVector.y+20);
    };

    var drawRect = function(position, color) {
        ctx.fillStyle = color;
        ctx.fillRect(position.x, position.y, 35, 35); // Rectangle size
    };

    var drawLine = function(position1, position2, color) {
        ctx.beginPath();
        ctx.moveTo(position1.x, position1.y);
        ctx.lineTo(position2.x, position2.y);
        ctx.strokeStyle = color;
        ctx.stroke();
    };

    var drawThickLine = function(position1, position2) {
        ctx.beginPath();
        ctx.lineWidth();
        ctx.moveTo(position1.x, position1.y);
        ctx.lineTo(position2.x, position2.y);
        ctx.strokeStyle = "blue";
        ctx.stroke();
    };
    

/*******                Visualizer                      ******/
    var initPvaList = function(input, position) {
        var curPosition = position;
        for(var i = 0; i < input.length; i++){
            initPva(input[i], curPosition);
            curPosition = curPosition.add(deltaRightVector);
        }
    };

    var initPva = function(input, position) {  // Init Position, Velocity, Acceleration
        if (input.pos === undefined) {
            input.pos = new vector(position.x, position.y);
        }
        if (input.v === undefined) {
            input.v = new vector(0,0);
        }
        if (input.a === undefined) {
            input.a = new vector(0,0);
        }

        if (input.sexpr !== undefined) {
            initPvaList(input.sexpr, position.add(deltaDownVector) );  // recurse
        }
    };

    var visualizeEnv = function() {
        for (var i = 0; i < ContextList.length; i++) {
            var x_loc = 20;
            for (var key in ContextList[i].scope) {
                 var keyValPair = key;
                 if( typeof ContextList[i].scope[key] !== "function" ) {
                    keyValPair = key + " : " + ContextList[i].scope[key]; // display value if not a function
                 }
                 drawText(keyValPair, {x:x_loc, y:30*i + 50} );

                 x_loc += 100;
            }
        } 
    };


// Draw AST transversal by the Interpreter
    var visualizeCurNodeStack = function() {
        for(var i = 1; i < curNodeStack.length; i++){
            drawLine(curNodeStack[i].pos, curNodeStack[i-1].pos, "red");
        }
    };

// Drawing AST
    var visualizeList = function(input, parent) {
        for(var i = 0; i < input.length; i++){
            if (parent !== undefined) {
                drawLine(input[i].pos, parent.pos, "white");
            }
            visualize(input[i]);
        }
    };

    var visualize = function(input) {
        var color = "white";
        
        if (input === curNodeStack[curNodeStack.length - 1]) {
            color = "red"; // highlight currently interpreting node red
        } else {
            color = "yellow";
        }
        
        drawRect(input.pos, color);
        drawText(input.value, input.pos);

        if (input.result !== undefined && 
            !(input.result instanceof Function) ) { // ignor functions
            drawText(input.result, input.pos.add( new vector(0,15) )); // draw result text
        }
            
        if (input.sexpr !== undefined) {
            visualizeList(input.sexpr, input);  // recurse
        }
    };

// Position
    var timestep = 0.01; // Time Step -- super important
    var updatePosition = function(input) {
        input.pos = input.pos.add( input.v.multiply(timestep) ); // Update pos += v*t

        if(input.sexpr !== undefined) {
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

        if(input.sexpr !== undefined) {
            updateVelocityList(input.sexpr); // Recurse Sub-Expression
        }
    };
    var updateVelocityList = function(input) {
        for(var i = 0; i < input.length; i++){
            updateVelocity(input[i]);
        }
    };

// Hooke's law: F = -kX
    var springLength = 30;    // default length of springs -- Parameter tweak
    var springConstant = 1.3; // spring tightness          -- Parameter tweak
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
            if (input[i].sexpr !== undefined) {
                springList(input[i].sexpr, input[i]); // Recurse - remember parent
            }
        }
    };


// Coulomb's law: F = k q1 q2 / r^2
    var chargeConstant = 80000; // k  // Parameter tweak
    var applyRepulsion = function(inputA, inputB){
        var distance = inputB.pos.subtract(inputA.pos); // TODO: when input1 and input2 pos overlap
        var distance_magSquared = distance.magnitudeSquared(); // denominator
        var direction = distance.normalize(); // unit length

        var delta_acc = direction.multiply(0.5 * chargeConstant / (distance_magSquared + 30 ) );   // Parameter tweak 
        inputA.a = inputA.a.add( delta_acc.neg() );  // Apply acceleration to A
        inputB.a = inputB.a.add( delta_acc );        // Apply acceleration to B
        return;
    };
    var repelAtom = function(input, other) { // other holds first time transversal input
        if(other === undefined) {  // 1st transveral 
            repelList(ast, input); // transverse AST again for each node - O(N^2)
        } else { // 2nd transversal - other holds current node
            if(input !== other){
                applyRepulsion(input, other); // apply electrostatic force between each node with every other node
            }
        }

        if(input.sexpr !== undefined) {
            repelList(input.sexpr, other); // recurse
        }
    };
    var repelList = function(input, other) {
        for(var i = 0; i < input.length; i++){
            repelAtom(input[i], other);
        }
    };

// Gravity to center of screen
    var centerConstant = 0.5;
    var centerOfCanvis = new vector(canvas.width / 2, canvas.height / 2);

    var gravity = function(input) {
        var distanceToCenter = centerOfCanvis.subtract(input.pos);
        var centerAcc = distanceToCenter.multiply(centerConstant);
        console.log("centerAcc", centerAcc);
        input.a = input.a.add( centerAcc );

        if(input.sexpr !== undefined) {
            gravityList(input.sexpr);
        }
    };

    var gravityList = function(input) {
        for(var i = 0; i < input.length; i++){
            gravity(input[i]);
        }
    };

/*******                Main                ******/    
/*******                Main                ******/
/*******                Main                ******/

    function main(){
        //var sourceCode = "( ( define foo ( lambda (a b) (+ a b) ) ) (foo 1 2) )";
       
        var sourceCode = "( ( define fib                            " +
                         "    ( lambda (x)                          " + 
                         "             ( if ( < x 2 )               " +  
                         "                  x                       " + 
                         "                  (* x ( fib (- x 1) )  ) " +
                         "  ) )        )                            " +
                         "  ( fib 5 )                               " +
                         ")                                         ";
       
        //var sourceCode = "( ( lambda (x) x ) 3 )";
        //var sourceCode = "(+ 3 5)";
        //var sourceCode = "(1 2 3)";
        //var sourceCode = "(/ 6 3)";

        tokenArray = sourceCode.replace(/\(/g, " ( ")
                               .replace(/\)/g, " ) ")
                               .trim()
                               .split(/\s+/);
        ast = parenthesize(tokenArray);

        var maxFrame = 10000; // <= number of Frames before Visualization stops

        var frame = 0;

// Visualize event loop
        var drawCall = function() { 
           
            if(frame > maxFrame) { // 1st Method - Stop
                window.clearInterval(drawIntervalID);
            }
            
            
            //console.log("drawCall", frame); // top left frames
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
            /*
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            */
            
            drawText("Frame: " + frame, {x:30, y:30}); // frame counter upper left

            initPvaList(ast, new vector(canvas.width/5,  canvas.height/5) ); // initialize Position, Velocity, Acceleration
            visualizeEnv(); // draw "Context" aka symbol tables
            visualizeList(ast); // draw AST

            springList(ast); // O(N)
            repelList(ast);  // O(N^2)
            gravityList(ast);

            updatePositionList(ast);
            updateVelocityList(ast);

            visualizeCurNodeStack(); // still messy

            frame++;

            /*
            if(frame < maxFrame) { // 2nd Method - Stop
                window.requestAnimationFrame(drawCall);
            }
            */
            return;
        };

        var drawIntervalID = window.setInterval(drawCall, 5); // 1st Method Start (2nd arg in millisecond)
        //drawCall(); // 2nd Method - Start

// Interpret event loop
        var libEnv  = new Context(library); // Libary Enviroment
        var globalEnv = new Context( {} , libEnv); // REPL Enviroment
        ContextList.push( libEnv );
        ContextList.push( globalEnv );

        var gen = interpretList(ast, globalEnv);

        var interpretLoop = function() {
            var step = gen.next();
            if(!step.done){
                console.log(">>> Not Done: ", step.result);
                window.setTimeout(interpretLoop, 100);  // interpreter timeout
            } else {
                console.log(">>> Final Result: ", step.result);
            }
        };

        interpretLoop();
        

        return;
    }

    document.addEventListener('DOMContentLoaded', main, false); // start when ready
}) ();
