function annularSector(options)
{
  var opts = optionsWithDefaults(options);
  var p = [ // points
    [opts.cx + opts.r2*Math.cos(opts.startRadians),
     opts.cy + opts.r2*Math.sin(opts.startRadians)],
    [opts.cx + opts.r2*Math.cos(opts.closeRadians),
     opts.cy + opts.r2*Math.sin(opts.closeRadians)],
    [opts.cx + opts.r1*Math.cos(opts.closeRadians),
     opts.cy + opts.r1*Math.sin(opts.closeRadians)],
    [opts.cx + opts.r1*Math.cos(opts.startRadians),
     opts.cy + opts.r1*Math.sin(opts.startRadians)],
  ];

  var angleDiff = opts.closeRadians - opts.startRadians;
  var largeArc = (angleDiff % (Math.PI*2)) > Math.PI ? 1 : 0;
  var cmds = [];
  cmds.push("M"+p[0].join());                                // Move to P0
  cmds.push("A"+[opts.r2,opts.r2,0,largeArc,1,p[1]].join()); // Arc to  P1
  cmds.push("L"+p[2].join());                                // Line to P2
  cmds.push("A"+[opts.r1,opts.r1,0,largeArc,0,p[3]].join()); // Arc to  P3
  cmds.push("z");
	return cmds.join(' ');

  function optionsWithDefaults(o){
    // Create a new object so that we don't mutate the original
    var o2 = {
      cx           : o.centerX || 0,
      cy           : o.centerY || 0,
      startRadians : (o.startDegrees || 0) * Math.PI/180,
      closeRadians : (o.endDegrees   || 0) * Math.PI/180,
    };

    var t = o.thickness!==undefined ? o.thickness : 100;
    if (o.innerRadius!==undefined)      o2.r1 = o.innerRadius;
    else if (o.outerRadius!==undefined) o2.r1 = o.outerRadius - t;
    else                                o2.r1 = 200           - t;
    if (o.outerRadius!==undefined)      o2.r2 = o.outerRadius;
    else                                o2.r2 = o2.r1         + t;

    if (o2.r1<0) o2.r1 = 0;
    if (o2.r2<0) o2.r2 = 0;

    return o2;
  }
}
function SelectContents(element)
{
	if (document.body.createTextRange) 
	{
        const range = document.body.createTextRange();
        range.moveToElementText(element);
        range.select();
    } 
	else if (window.getSelection) 
	{
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    } 
	else 
	{
        console.warn("Could not select element contents: Unsupported browser.");
    }
}
function CopyContentsToClipboard(element)
{
	//Todo: Doesn't work on non-selectable content
	SelectContents(element);
	document.execCommand('copy');
	//document.getSelection().removeAllRanges(); //TODO: Maybe unselect after done?
}
function msToCollapsedString(ms)
{
	let time = new Date(ms);
	let hours = time.getUTCHours();
	let minutes = time.getUTCMinutes();
	let seconds = time.getUTCSeconds();
	let milliseconds = time.getUTCMilliseconds();
	
	if(hours)
	{
		return hours + ":" + minutes.toString().padStart(2,'0')+ ":" + seconds.toString().padStart(2,'0') + "." + milliseconds.toString().padStart(3,'0');
	}
	else if(minutes)
	{
		return minutes + ":" + seconds.toString().padStart(2,'0') + "." + milliseconds.toString().padStart(3,'0');
	}
	else
	{
		return seconds + "." + milliseconds.toString().padStart(3,'0');
	}
}



//My WebGL framework functions   //TODO Timeout mouse hover
function AdjustDrawingBufferViewport(canvasElement)
{
	if(canvasElement instanceof HTMLCanvasElement)
	{
		/* Update Drawing Buffer */
		canvasElement.width  = canvasElement.clientWidth;
		canvasElement.height = canvasElement.clientHeight;
	
		/* Update Viewport */
		canvasElement.WebGL.viewport(0,0,canvasElement.width, canvasElement.height);
	}
	else{alert('Drawing Buffer / Viewport cannot be adjusted for non-canvas elements')}
}
const ReRenderEvent = new CustomEvent('render', {
	bubbles: true,
	detail: { dt: 0 }
});
/* ResizeObserver(not well supported by IE/iOS, consider alternatives) */
const ElementResizeEvent = new CustomEvent('elementResize', {
	bubbles: true,
	detail: {}
});
const ResizeManager = new ResizeObserver(function(entries, observer) {
	for (let entry of entries) 
	{
		entry.target.dispatchEvent(ElementResizeEvent);
	}
});
function SetupWebGLFigure(ROOT)
{
	ROOT.currentTime = 0;

	let CANVAS = document.createElement("CANVAS");
	ROOT.appendChild(CANVAS);
	
	ROOT.GLI = new WebGLInstance(CANVAS);
	ROOT.GLI.useShaders(
		document.getElementById(ROOT.getAttribute("data-vert")).text,
		document.getElementById(ROOT.getAttribute("data-frag")).text
	);
	const GLSL_Time = ROOT.GLI.getUniformLocation("time");
	const GLSL_Resolution = ROOT.GLI.getUniformLocation("resolution");
	
	let OVERLAY = document.createElement("DIV");
		OVERLAY.setAttribute("class","overlay");
	ROOT.appendChild(OVERLAY);
		
	let HEADER = document.createElement("header");
	OVERLAY.appendChild(HEADER);	
	
	let TITLE = document.createElement("h4");
		TITLE.setAttribute("class","title");
		TITLE.innerHTML = ROOT.getAttribute("alt");
	HEADER.appendChild(TITLE);
	
	let REZ = document.createElement("h4");
		REZ.innerHTML = "512 x 512";
	HEADER.appendChild(REZ);
	
	
	let CONTROLS = document.createElement("DIV");
		CONTROLS.setAttribute("class","PlaybackControls");
	OVERLAY.appendChild(CONTROLS);
	
	/* Setup Play/Pause Support */
	function TogglePause(evt){ROOT.classList.toggle("paused");}
	let PLAY_BUTTON = document.createElement("BUTTON");
		PLAY_BUTTON.setAttribute("class","PlayButton");
		PLAY_BUTTON.innerHTML = '<div class="PlayIcon"></div>';
		PLAY_BUTTON.addEventListener("click", TogglePause); //PlayButton click
		CANVAS.addEventListener("click", TogglePause); //Canvas Click
	CONTROLS.appendChild(PLAY_BUTTON);
	
	/* Setup Replay/Restart Support */
	let REPLAY_BUTTON = document.createElement("BUTTON");
		REPLAY_BUTTON.setAttribute("class","ReplayButton");
		REPLAY_BUTTON.innerHTML = '<svg><use href="#ReplaySymbol"></use></svg>';
		REPLAY_BUTTON.addEventListener("click", () => {ROOT.currentTime=0; CANVAS.dispatchEvent(ReRenderEvent);}); //ReplayButton Click
	CONTROLS.appendChild(REPLAY_BUTTON);
	
	/* Setup Aduio Controls */
	function ToggleMute(){ROOT.classList.toggle("muted");}
	let AUDIO_BUTTON = document.createElement("BUTTON");
		AUDIO_BUTTON.setAttribute("class","AudioButton");
		AUDIO_BUTTON.innerHTML = '<svg><g class="AudioSpeaker"><use href="#AudioSpeakerSymbol" /><use class="Waves" href="#AudioSpeakerWavesSymbol" /></g><use class="AudioSpeakerSlash" href="#AudioSpeakerSlashSymbol" /></svg>';
		AUDIO_BUTTON.addEventListener("click", ToggleMute);
	CONTROLS.appendChild(AUDIO_BUTTON);
	
	
	let AUDIO_SLIDER_PANEL = document.createElement("DIV");
		AUDIO_SLIDER_PANEL.setAttribute("class","AudioSliderPanel");
	CONTROLS.appendChild(AUDIO_SLIDER_PANEL);
	function AdjustVolume(evt)
	{
		evt.target.style.background = "linear-gradient(to right, currentColor "+evt.target.value+"%, #ffffff33 0%)";
		AUDIO_BUTTON.getElementsByClassName("Waves")[0].style.clipPath = "circle("+(evt.target.value/2.5+10)+"%)";
	}
	let AUDIO_SLIDER = document.createElement("INPUT");
		AUDIO_SLIDER.setAttribute("class","AudioSlider");
		AUDIO_SLIDER.setAttribute("type","range");
		AUDIO_SLIDER.setAttribute("value","100");
		AUDIO_SLIDER.addEventListener("input", AdjustVolume);
	AUDIO_SLIDER_PANEL.appendChild(AUDIO_SLIDER);
	
	
	let TIME_DISPLAY = document.createElement("SPAN");
		TIME_DISPLAY.setAttribute("class","TimeDisplay");
		ROOT.addEventListener("render",(renderEvent)=> {
			ROOT.currentTime+=renderEvent.detail.dt;
			if(GLSL_Time)
			{
				ROOT.GLI.setUniformValue_F(GLSL_Time, ROOT.currentTime);
			}
			TIME_DISPLAY.innerHTML = msToCollapsedString(ROOT.currentTime);
		});
	CONTROLS.appendChild(TIME_DISPLAY);
	
	
	/* Setup Enter/Exit Fullscreen Support */
	function ToggleFullscreen(evt)
	{
		console.log("Full", evt);
		(document.fullscreenElement?document.exitFullscreen():ROOT.requestFullscreen())
			.then({})
			.catch(err => 
				alert("An error occurred while trying to "+document.fullscreenElement?"Exit":"Enter"+"Fullscreen mode: "+err.message+" ("+err.name+")")
			);
	}
	let FULLSCREEN_BUTTON = document.createElement("BUTTON");
		FULLSCREEN_BUTTON.setAttribute("class","FullscreenButton");
		FULLSCREEN_BUTTON.innerHTML = '<div class="FullscreenIcon"><div></div><div></div><div></div><div></div></div>';
		FULLSCREEN_BUTTON.addEventListener("click", ToggleFullscreen); //FullscreenButton Click
		CANVAS.addEventListener("dblclick", ToggleFullscreen); //Canvas DoubleClick
	CONTROLS.appendChild(FULLSCREEN_BUTTON);
	
	let NOTIFY = document.createElement("DIV");
		NOTIFY.setAttribute("class","PlayNotification");
		NOTIFY.innerHTML = '<div class="PlayIcon" ></div>';
		
	ROOT.appendChild(NOTIFY);
	
	ResizeManager.observe(CANVAS);
	CANVAS.addEventListener("elementResize", function()
	{
		/* Update Drawing Buffer + Viewport */
		AdjustDrawingBufferViewport(CANVAS);
		/* Update Render */
		CANVAS.dispatchEvent(ReRenderEvent);
		REZ.innerHTML = CANVAS.width + " x " + CANVAS.height;
		
		if(GLSL_Resolution)
		{
			ROOT.GLI.setUniformValue_2V(GLSL_Resolution, [CANVAS.width, CANVAS.height]);
		}
	});
}
function WebGLInstance(canvasElement)
{
	this.canvas = canvasElement;	

	const GL = canvasElement.getContext("webgl");
	canvasElement.WebGL = GL;
	AdjustDrawingBufferViewport(canvasElement);
		GL.clearColor(0.0, 0.0, 0.0, 1.0);
		GL.enable(GL.DEPTH_TEST);
  
  
	function MakeShader(shdrType, shdrCode) //Helper function
	{
		const SHDR = GL.createShader(shdrType); //Creates empty shader object of type
					 GL.shaderSource(SHDR,shdrCode); //Loads in GLSL script to shader
					 GL.compileShader(SHDR); //Compiles shader code
		if(!GL.getShaderParameter(SHDR, GL.COMPILE_STATUS)) //checks for compile errors
		{
			alert("Shader failed to compile");
			console.error("Shader Compile Error: "+GL.getShaderInfoLog(SHDR));
			GL.deleteShader(SHDR); //Shader failed, so delete. Don't leak shader
			return null;
		}
		return SHDR;
	}
	
	this.useShaders = function(vertShdrCode, fragShdrCode)
	{
		const PROGRAM = GL.createProgram();
						GL.attachShader(PROGRAM,MakeShader(GL.VERTEX_SHADER,  vertShdrCode));
						GL.attachShader(PROGRAM,MakeShader(GL.FRAGMENT_SHADER,fragShdrCode));
						GL.linkProgram(PROGRAM);
		const SHDRS = GL.getAttachedShaders(PROGRAM);
		if(!GL.getProgramParameter(PROGRAM, GL.LINK_STATUS)) //check for link error
		{
			alert("Shader program failed to link");
			console.error("Program Link Error: "+GL.getProgramInfoLog(PROGRAM));
			for(let i=0;i<SHDRS.length;++i)
			{
			  GL.deleteShader(SHDRS[i]); //Dont leak shaders
			}
			GL.deleteProgram(PROGRAM);//We don't need the program anymore
			return null;
		}
		for(let i=0;i<SHDRS.length;++i)//Always detach shaders after a successful link.
		{
			GL.detachShader(PROGRAM,SHDRS[i]);
			GL.deleteShader(SHDRS[i]); //only because shader not used anywhere else
		}
		GL.useProgram(PROGRAM);
	}
	
	this.setupArrayBuff = function(data,attribute)//RN assumes length 4
	{
		const BUFFER = GL.createBuffer();
		GL.bindBuffer(GL.ARRAY_BUFFER, BUFFER);
		GL.bufferData(GL.ARRAY_BUFFER, data, GL.STATIC_DRAW);
		
		let attLoc = GL.getAttribLocation(GL.getParameter(GL.CURRENT_PROGRAM), attribute);
		GL.enableVertexAttribArray(attLoc); //Allows Attribute to be used
		GL.vertexAttribPointer(attLoc, 4, GL.FLOAT, false, 0, 0); //Binds attribute to currently bound buffer
		
		GL.bindBuffer(GL.ARRAY_BUFFER, null);
		
		return BUFFER;
	}
	
	this.setupIndexBuff = function(data, keepbound = false)//RN assumes length 4
	{
		const BUFFER = GL.createBuffer();
		GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, BUFFER);
		GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, data, GL.STATIC_DRAW);
		if(!keepbound)
		{
			GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
		}
		return BUFFER;
	}
	
	this.getUniformLocation = function(uniform)
	{
		return GL.getUniformLocation(GL.getParameter(GL.CURRENT_PROGRAM),uniform);
	}
	
	this.setUniformValue_F = function(uniformLoc,value)
	{
		GL.uniform1f(uniformLoc, value);
	}
	this.setUniformValue_2V = function(uniformLoc,value)
	{
		GL.uniform2fv(uniformLoc, value);
	}
	this.setUniformValue_M4 = function(uniformLoc,value)
	{
		GL.uniformMatrix4fv(uniformLoc, false, value);
	}
	
	this.clear = function()
	{
		GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT); //clear canvas
	}
	this.drawTriangles = function(length)
	{
		GL.drawElements(GL.TRIANGLES, length, GL.UNSIGNED_BYTE,0);
	}
}

function MainRenderLoop(msTimeStamp)
{
	let msDeltaTime = msTimeStamp-MainRenderLoop.previousTimeStamp; //How much time since last render

	let glFigures = document.getElementsByClassName("webgl");
	for(let i=0;i<glFigures.length;++i)
	{
		let figure = glFigures[i];
		if(!figure.classList.contains("paused"))
		{
			figure.dispatchEvent(new CustomEvent("render",{detail: {dt:msDeltaTime}}))
		}
	}
	
	MainRenderLoop.previousTimeStamp = msTimeStamp;
	window.requestAnimationFrame(MainRenderLoop);
}
MainRenderLoop.previousTimeStamp = 0;
document.addEventListener("visibilitychange",function(event) //Effectively preserves time position when hidden
{
	MainRenderLoop.previousTimeStamp = event.timeStamp;
});
MainRenderLoop(0);
let glFigures = document.getElementsByClassName("webgl");
for(let i=0;i<glFigures.length;++i)
{
	SetupWebGLFigure(glFigures[i]);
}
