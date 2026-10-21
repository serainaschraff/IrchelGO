import type { RefObject } from "react";

export async function startCamera(videoRef: RefObject<HTMLVideoElement | null>) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {facingMode: "environment"},
            audio: false
        });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    } catch (error) {
        console.error("Camera access denied:", error);
        alert("Camera access denied. Please allow camera permissions. Error: " + String(error));
    }
    /*
    return new Promise<void>((resolve) => {
        if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
                resolve();
            };
        } else {
            resolve();
        }
    });
    */
}
