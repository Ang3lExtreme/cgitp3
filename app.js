import
{
    buildProgramFromSources,
    loadShadersFromURLS,
    setupWebGL
}
from "../../libs/utils.js";
import
{
    ortho,
    lookAt,
    flatten,
    mult,
    rotate,
    rotateX,
    perspective
}
from "../../libs/MV.js";
import
{
    modelView,
    loadMatrix,
    multRotationX,
    multRotationY,
    multRotationZ,
    multScale,
    multTranslation,
    popMatrix,
    pushMatrix
}
from "../../libs/stack.js";
import
{
    GUI
}
from '../../libs/dat.gui.module.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js'
import * as SPHERE from '../../libs/objects/sphere.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as BUNNY from '../../libs/objects/bunny.js';

//AUTHOR: Frederico Luz nº 51162

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    /** @type WebGL2RenderingContext */
    let gl = setupWebGL(canvas);
    // Drawing mode (gl.LINES or gl.TRIANGLES)
    let mode = gl.TRIANGLES;
    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    let mProjection = ortho(-1 * aspect, aspect, -1, 1, 0.01, 3);
    let zoom = 6;

    /** Model parameters */

    let engine = false;
    let rotor = 0;
    let velocity = 0;
    let heliY = 0;
    let heliX = 1.7;
    let heliTime = 0;
    let leanAngle = 0;
    let drop = false;
    let canDropAgain = true;
    let time = 0;
    let boxTime = 0;
    let boxY = 0;
    let boxX = 0;
    let boxZ = 0;
    let vBoxY = 0;
    let vBoxX = 0;
    let reduceLean = false;
    let aceleration = 0;
    let increaseVelocity = false;
    let mov = 0;
    let firstperson = false;
    let start = new Date();

    let cameraController = {
        eyeX: 2,
        eyeY: 1.2,
        eyeZ: 1,

        atX: 0,
        atY: 0.5,
        atZ: 0,

        upX: 0,
        upY: 1,
        upZ: 0,

        getViewMatrix: function()
        {
            return lookAt([this.eyeX, this.eyeY, this.eyeZ], [this.atX, this.atY, this.atZ], [this.upX, this.upY, this.upZ]);
        },

        setValues: function(eyeX, eyeY, eyeZ, atX, atY, atZ, upX, upY, upZ)
        {
            this.eyeX = eyeX;
            this.eyeY = eyeY;
            this.eyeZ = eyeZ;
            this.atX = atX;
            this.atY = atY;
            this.atZ = atZ;
            this.upX = upX;
            this.upY = upY;
            this.upZ = upZ;

        }
    };

    let mView = lookAt([cameraController.eyeX, cameraController.eyeY, cameraController.eyeZ], [cameraController.atX, cameraController.atY, cameraController.atZ], [cameraController.upX, cameraController.upY, cameraController.upZ]);
    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeyup = function(e)
    {
        switch (e.key)
        {
            case "ArrowLeft":
                reduceLean = true;
                increaseVelocity = false;
                break;
        }
    }

    document.onkeydown = function(event)
    {
        switch (event.key)
        {
            case '1':
                // exonometric view
                cameraController.setValues(2, 1.2, 1, 0, 0.5, 0, 0, 1, 0);
                break;
            case '2':
                // front view
                cameraController.setValues(-1, 0.6, 0, 0, 0.6, 0, 0, 1, 0);
                break;
            case '3':
                // top view
                cameraController.setValues(0, 1.6, 0, 0, 0.6, 0, 0, 0, -1);
                break;
            case '4':
                // right view
                cameraController.setValues(0, 0.5, 5, 0, 0.2, -5, 0, 1, 0);
                break;
                //put camera on helicopter
            case '5':
                firstperson = !firstperson;
                break;
            case 'w':
                mode = gl.LINES;
                break;
            case 's':
                mode = gl.TRIANGLES;
                break;
            case '+':
                zoom /= 1.1;
                break;
            case '-':
                zoom *= 1.1;
                break;
                //case up arrow key engine start
            case 'ArrowUp':
                engine = true;
                heliY < 3 ? heliY += 0.08 : heliY = 3;
                break;
                //case down arrow key engine stop
            case 'ArrowDown':
                if (heliY > 0.009)
                {
                    if (leanAngle >= 10 && heliY < 0.1)
                    {
                        heliY = heliY;
                    }
                    else
                    {
                        heliY -= 0.08;
                    }
                }
                else
                {
                    heliY = 0;
                    engine = false;
                }
                break;
                //case left arrow lean helicopter to front until 30 degrees
            case 'ArrowLeft':
                if (leanAngle <= 30 && engine == true && heliY >= 0.08)
                {
                    leanAngle += 1;
                    increaseVelocity = true;
                }
                break;
                //case right arrow lean helicopter to back until 0 degrees
            case 'ArrowRight':
                if (leanAngle >= 0 && engine == true)
                {
                    leanAngle -= 0.5;
                    increaseVelocity = false;
                    aceleration > 0 ? aceleration -= 0.01 : aceleration = 0;
                }
                break;
                //case spacebar drop a box from helicopter
            case ' ':
                if (canDropAgain == true)
                {
                    drop = true;
                    boxTime = time;
                    boxY = heliY;
                    boxX = heliX;
                    boxZ = mov;
                    vBoxY = 0;
                    vBoxX = velocity;
                }
                break;


        }
    }

    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.enable(gl.DEPTH_TEST); // Enables Z-buffer depth test

    CUBE.init(gl);
    CYLINDER.init(gl);
    SPHERE.init(gl);
    TORUS.init(gl);
    BUNNY.init(gl);

    window.requestAnimationFrame(render);

    function setupGUI()
    {
        //manipulate the projection matrix
        let gui = new GUI();

        let eye = gui.addFolder("Eye");
        eye.add(cameraController, "eyeX", -5, 5, 0.1)
        eye.add(cameraController, "eyeY", -5, 5, 0.1)
        eye.add(cameraController, "eyeZ", -5, 5, 0.1)
        eye.open();

        let at = gui.addFolder("At");
        at.add(cameraController, "atX", -5, 5, 0.1)
        at.add(cameraController, "atY", -5, 5, 0.1)
        at.add(cameraController, "atZ", -5, 5, 0.1)
        at.open();

        let up = gui.addFolder("Up");
        up.add(cameraController, "upX", -5, 5, 0.1)
        up.add(cameraController, "upY", -5, 5, 0.1)
        up.add(cameraController, "upZ", -5, 5, 0.1)
        up.open();
    }

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
        mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, 0.01, 3);
    }

    function uploadProjection()
    {
        uploadMatrix("mProjection", mProjection);
    }

    function uploadModelView()
    {
        uploadMatrix("mModelView", modelView());
    }

    function uploadMatrix(name, m)
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, flatten(m));
    }



    function base()
    {
        pushMatrix()
        multScale([10, 0.5, 10]);
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), [0.5, 0.5, 0.5, 1.0]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
        popMatrix();

    }

   


    setupGUI();

    function render()
    {
        window.requestAnimationFrame(render);
        var now = new Date().getTime();
        time = now - start;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        // Send the mProjection matrix to the GLSL program
        mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, -15, 15);

        uploadProjection(mProjection);

        // Load the ModelView matrix with the Worl to Camera (View) matrix
        mView = cameraController.getViewMatrix();

        loadMatrix(mView);

        // Draw the base for the scene
        multTranslation([0, 0, 0]);
        pushMatrix();
        base();

        pushMatrix();
        //draw cube
        multScale([2,2,2]);
        multTranslation([1.1, 0.5, 1.1]);
        uploadModelView();
        //paint color of cube with color red
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), [1, 0, 0, 1.0]);
        uploadModelView();
        CUBE.draw(gl, program, mode);

        popMatrix();
        //draw cylinder
        pushMatrix();
        multScale([2, 2, 2]);
        multTranslation([-1.1, 0.5, 1.1]);
        uploadModelView();
        //paint color of cylinder with color GREEN
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), [0, 1, 0, 1.0]);
        uploadModelView();
        CYLINDER.draw(gl, program, mode);
        popMatrix();
        //draw torus
        pushMatrix();
        multScale([2, 2, 2]);
        multTranslation([1.1, 0.32, -1.1]);
        uploadModelView();
        //paint color of torus with color dark green
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), [0, 0.5, 0, 1.0]);
        uploadModelView();
        TORUS.draw(gl, program, mode);
        popMatrix(); 

        //draw BUNNY
        pushMatrix();
        multScale([13 ,13, 13]);
        multTranslation([-0.15, 0, -0.15]);
        uploadModelView();
        //paint color of BUNNY with color pink
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), [1, 0, 1, 1.0]);
        uploadModelView();
        BUNNY.draw(gl, program, mode);
        popMatrix();


}
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders));