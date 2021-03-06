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

    var nodeLength = 35;

    var drawRect = function(position, color) {
        ctx.fillStyle = color;
        ctx.fillRect(position.x, position.y, nodeLength, nodeLength); // Rectangle size
    };

    var drawLine = function(position1, position2, lineColor) {
        ctx.beginPath();
        ctx.moveTo(position1.x + (nodeLength/2) , position1.y + nodeLength); // starts at center bottom
        ctx.lineTo(position2.x + (nodeLength/2) , position2.y);  // ends at center top
        ctx.strokeStyle = lineColor;
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

        if (parent !== undefined) { // draw top to bottom line
            drawLine(parent.pos, input[0].pos, "white");
            drawLine(parent.pos, input[input.length -1].pos, "white");
        }

        for(var i = 0; i < input.length; i++){
            visualize(input[i]);
        }
    };

    var visualize = function(input) {
        var color = "white";
        
        if (input === curNodeStack[curNodeStack.length - 1]) {
            color = "red"; // highlight currently interpreting node red
        } else {
            color = "#FFEB3B";
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
    var damping = 0.7;
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
    var springLength = 100;    // default length of springs -- Parameter tweak
    var xSpringConstant = 20;
    var ssApplySpring = function(inputA, inputB) {
        //var d = inputB.pos.x - inputA.pos.x;
        var d = inputB.leftmost - inputA.rightmost;

        console.debug("what is d", d);
        var displacement = d - springLength;
        var d_squared = displacement ; // preserve sign

        var delta_a = xSpringConstant * d_squared * 0.5;

        inputA.a.x = inputA.a.x + delta_a;   // core
        inputB.a.x = inputB.a.x - delta_a;   // core
    };

    var ySpringConstant = 100.0;
    var applyTopBottom = function(topNode, bottomList) {
        var topX    = topNode.pos.x;
        var bottomX = (bottomList[0].pos.x + bottomList[bottomList.length -1].pos.x ) / 2;

        var displacement = bottomX - topX;
        var delta_a = ySpringConstant * displacement * 0.5;

        topNode.a.x = topNode.a.x + delta_a;   // core

        for (var i = 0 ; i < bottomList.length ; i++) {
            bottomList[i].a.x -=  delta_a;   // core
        }

    };

    var BFT = function(input_queue, level){ // Apply horizontal force

        if (level >= 50) {
            return;
        }

        var next_level_queue = [];
        var cur_node = undefined;

        for (var input of input_queue) {              // interate over lists in queue
            //console.log("BFT input: ", input);
            for (var i = 0 ; i < input.length; i++){  // interate over nodes in list
                //console.log("BFT input [i , value]: ", i, input[i].value);

           console.assert(input[i].leftmost != undefined ,  "Leftmost does not exist");
           console.assert(input[i].rightmost != undefined ,  "rightmost does not exist");

           console.debug("BFT", input[i].leftmost)

                if(cur_node !== undefined) {  // start after the first node
                    ssApplySpring(cur_node, input[i]);

                }
                cur_node = input[i];

                if (input[i].sexpr !== undefined) {
                    applyTopBottom(input[i] , input[i].sexpr);
                    next_level_queue.push(input[i].sexpr);
                    //console.log("BFT added to queue: ", next_level_queue);
                }
            }
        }

        if(next_level_queue.length >= 1) {
            BFT(next_level_queue, ++level );
        }
    };

    var dfsAtom = function ( input ) {
        console.debug("DFS: ", input);
        var listRT = undefined;
        if (input.sexpr != undefined ) {
           listRT = dfsList( input.sexpr );
        }

        if (listRT != undefined ) {
            if ( listRT.leftmost <= input.pos.x ) {
                input.leftmost = listRT.leftmost
            } else {
                input.leftmost = input.pos.x;
            }

            if ( listRT.rightmost >= input.pos.x ) {
                input.rightmost = listRT.rightmost
            } else {
                input.rightmost = input.pos.x;
            }
        } else {
            input.leftmost = input.pos.x;
            input.rightmost = input.pos.x;
        }
        console.assert(input.leftmost <= input.pos.x ,  "Leftmost must to to the left of current X");
        console.assert(input.rightmost >= input.pos.x ,  "Rightmost must to to the right of current X");
    }

    var dfsList = function( input ) {
        for(var i = 0; i < input.length ; i++) {
            dfsAtom(input[i]);
        }

        if( input.length >= 1 ) {
            return {leftmost : input[0].pos.x , rightmost : input[input.length-1].pos.x}
        }

    };


// Gravity to center of screen
    var centerConstant = 5;
    var centerOfCanvis = canvas.width / 2;
    var xCanvis = canvas.width;

    var gravity = function(input) {
        var distanceToCenter = centerOfCanvis - input.pos.x;
        var centerAcc = distanceToCenter * centerConstant;
        console.log("centerAcc", centerAcc);

        // start applying gravity when node is near the edge of the screen
        if ( input.pos.x < xCanvis * 0.05 ||
             input.pos.x > xCanvis * 0.95 ) {             
            input.a.x += centerAcc;
        }

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
                         "  ( fib 1 )                               " +
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
            /*
            if(frame > maxFrame) { // 1st Method - Stop
                window.clearInterval(drawIntervalID);
            }
            */
            
            //console.log("drawCall", frame); // top left frames
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
            /*
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            */
            
            drawText("Frame: " + frame, {x:30, y:30}); // frame counter upper left

            initPvaList(ast, new vector(canvas.width/6,  canvas.height/8) ); // initialize Position, Velocity, Acceleration
            visualizeEnv(); // draw "Context" aka symbol tables
            visualizeList(ast); // draw AST

            dfsList( ast ); // calc leftmost and rightmost of a current node with its sub-expression

            BFT( [ast] , 0  ); // Apply horizontal force


            gravityList(ast);


            updatePositionList(ast);
            updateVelocityList(ast);

            visualizeCurNodeStack(); // still messy

            frame++;

            
            if(frame < maxFrame) { // 2nd Method - Stop
                window.requestAnimationFrame(drawCall);
            }
            
            return;
        };

        //var drawIntervalID = window.setInterval(drawCall, 5); // 1st Method Start (2nd arg in millisecond)
        drawCall(); // 2nd Method - Start

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
