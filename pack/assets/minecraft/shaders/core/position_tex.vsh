#version 150

//Custom sun textures would not have been possible without VonLeipenstein patiently working with me.
//He made a space-themed data pack called "The Expansion." You should totally check it out some time.

layout(std140) uniform DynamicTransforms {
    mat4 ModelViewMat;
    vec4 ColorModulator;
    vec3 ModelOffset;
    mat4 TextureMat;
    float LineWidth;
};
layout(std140) uniform Projection {
    mat4 ProjMat;
};
#moj_import <minecraft:fog.glsl>

in vec3 Position;
in vec2 UV0;
in vec4 Color;

uniform sampler2D Sampler0;

out vec2 texCoord0;
out vec4 vertexColor;

// import functions
#moj_import <bracken:compare_float.glsl>
#moj_import <bracken:shift_texture.glsl>


void main() {
    gl_Position = ProjMat * ModelViewMat * vec4(Position, 1.0);
    vertexColor = Color;

    vec4 corners = texture(Sampler0, vec2(0.0)) * 255.0;

   //checks corner pixel colours
    if (corners == vec4(1.0, 2.0, 3.0, 255.0)) {
        //checks custom biome fog colours
        if (approxEquals(FogColor.rgb * 255.0, vec3(141.0, 53.0, 48.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(142.0, 53.0, 48.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }
         else if (approxEquals(FogColor.rgb * 255.0, vec3(143.0, 53.0, 48.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }
         else if (approxEquals(FogColor.rgb * 255.0, vec3(144.0, 53.0, 48.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }
         else if (approxEquals(FogColor.rgb * 255.0, vec3(145.0, 53.0, 48.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }
         else if (approxEquals(FogColor.rgb * 255.0, vec3(146.0, 53.0, 48.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }
         else if (approxEquals(FogColor.rgb * 255.0, vec3(147.0, 53.0, 48.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(209.0, 84.0, 62.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum uv shift
        }

        else if (approxEquals(FogColor.rgb * 255.0, vec3(255.0, 96.0, 87.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum nv uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(255.0, 95.0, 86.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum nv uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(255.0, 94.0, 85.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum nv uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(255.0, 93.0, 84.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum nv uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(255.0, 92.0, 83.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 4.0); //sanctum nv uv shift
        }


        else if (approxEquals(FogColor.rgb * 255.0, vec3(2.0, 1.0, 3.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 1.0); //faewild uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(4.0, 3.0, 6.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 1.0); //faewild uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(5.0, 4.0, 7.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 1.0); //faewild uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(6.0, 4.0, 8.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 1.0); //faewild uv shift
        }

        else if (approxEquals(FogColor.rgb * 255.0, vec3(178.0, 136.0, 255.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 1.0); //faewild nv uv shift
        }


        else if (approxEquals(FogColor.rgb * 255.0, vec3(155.0, 128.0, 103.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 3.0); //dormis uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(255.0, 211.0, 169.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 2.0); //dormis nv uv shift
        }


        else if (approxEquals(FogColor.rgb * 255.0, vec3(10.0, 7.0, 20.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 8.0); //varskspace uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(8.0, 6.0, 18.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 8.0); //varskspace uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(10.0, 7.0, 21.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 8.0); //varskspace uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(10.0, 7.0, 22.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 8.0); //varskspace uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(8.0, 5.0, 17.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 8.0); //varskspace uv shift
        }

        else if (approxEquals(FogColor.rgb * 255.0, vec3(121.0, 83.0, 255.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 6.0); //varskspace nv uv shift
        }


        else if (approxEquals(FogColor.rgb * 255.0, vec3(0.0, 12.0, 0.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 9.0); //omnidrome uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(0.0, 13.0, 0.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 9.0); //omnidrome uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(0.0, 15.0, 0.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 9.0); //omnidrome uv shift
        }

        else if (approxEquals(FogColor.rgb * 255.0, vec3(248.0, 255.0, 251.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 5.0); //pax nv uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(245.0, 255.0, 253.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 5.0); //pax nv uv shift
        }


        else if (approxEquals(FogColor.rgb * 255.0, vec3(212.0, 221.0, 220.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 5.0); //pax uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(213.0, 220.0, 218.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 5.0); //pax uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(214.0, 220.0, 217.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 5.0); //pax uv shift
        }


        else if (approxEquals(FogColor.rgb * 255.0, vec3(205.0, 255.0, 225.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 10.0); //brine uv shift
        }

        else if (approxEquals(FogColor.rgb * 255.0, vec3(143.0, 152.0, 255.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 10.0); //brine water uv shift
        }   
        else if (approxEquals(FogColor.rgb * 255.0, vec3(112.0, 12.0, 255.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 11.0); //brine median uv shift
        }
        else if (approxEquals(FogColor.rgb * 255.0, vec3(0.0, 0.0, 0.0), 1.0)) {
            texCoord0 = shiftUV(UV0, 12.0, 7.0); //brine void uv shift
        }





        else {
            texCoord0 = vec2(UV0.x, UV0.y / 12.0);
        }
    }
    else {
        texCoord0 = UV0;
    }
}