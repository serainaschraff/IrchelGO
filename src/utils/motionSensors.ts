type PermissionRequestConstructor = {
  requestPermission?: () => Promise<PermissionState>;
};

type SensorPermissionName =
  | "accelerometer"
  | "gyroscope";

type SensorPermissionResult = {
  name: SensorPermissionName;
  state: string;
};

export async function checkMotionSensorAccess(): Promise<string> {
  const hasMotionEvent = typeof window.DeviceMotionEvent !== "undefined";
  const hasOrientationEvent = typeof window.DeviceOrientationEvent !== "undefined";

  if (!hasMotionEvent && !hasOrientationEvent) {
    return "Motion and orientation event APIs are unavailable in this browser.";
  }

  let motionEvents = 0;
  let orientationEvents = 0;
  const onMotion = () => {
    motionEvents += 1;
  };
  const onOrientation = () => {
    orientationEvents += 1;
  };

  window.addEventListener("devicemotion", onMotion);
  window.addEventListener("deviceorientation", onOrientation);

  const motionConstructor = window.DeviceMotionEvent as
    | (typeof DeviceMotionEvent & PermissionRequestConstructor)
    | undefined;
  const orientationConstructor = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & PermissionRequestConstructor)
    | undefined;

  const permissionRequests: Array<{
    sensor: string;
    request: Promise<PermissionState>;
  }> = [];
  function addPermissionRequest(
    sensor: string,
    constructor: PermissionRequestConstructor | undefined,
  ) {
    if (!constructor?.requestPermission) return;
    try {
      permissionRequests.push({
        sensor,
        request: constructor.requestPermission(),
      });
    } catch (error) {
      permissionRequests.push({
        sensor,
        request: Promise.reject(error),
      });
    }
  }

  addPermissionRequest("DeviceMotionEvent", motionConstructor);
  addPermissionRequest("DeviceOrientationEvent", orientationConstructor);

  const permissionResults: string[] = await Promise.all(
    permissionRequests.map(async ({ sensor, request }) => {
      try {
        return `${sensor}: ${await request}`;
      } catch (error) {
        return `${sensor}: request failed (${String(error)})`;
      }
    }),
  );

  const permissionNames: SensorPermissionName[] = [
    "accelerometer",
    "gyroscope",
  ];
  const queriedPermissions: SensorPermissionResult[] = [];

  if (navigator.permissions?.query) {
    for (const name of permissionNames) {
      try {
        const status = await navigator.permissions.query({
          name: name as PermissionName,
        });
        queriedPermissions.push({ name, state: status.state });
      } catch (error) {
        queriedPermissions.push({
          name,
          state: `not queryable (${String(error)})`,
        });
      }
    }
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 1500);
  });
  window.removeEventListener("devicemotion", onMotion);
  window.removeEventListener("deviceorientation", onOrientation);

  const apiSummary = [
    `DeviceMotionEvent ${hasMotionEvent ? "available" : "unavailable"}`,
    `DeviceOrientationEvent ${hasOrientationEvent ? "available" : "unavailable"}`,
  ].join("; ");
  const permissionSummary =
    permissionResults.length > 0
      ? permissionResults.join("; ")
      : queriedPermissions.length > 0
        ? queriedPermissions
            .map(({ name, state }) => `${name}: ${state}`)
            .join("; ")
        : "permission state cannot be queried by this browser";
  const eventSummary = [
    `motion events: ${motionEvents > 0 ? `received (${motionEvents})` : "none received"}`,
    `orientation events: ${orientationEvents > 0 ? `received (${orientationEvents})` : "none received"}`,
  ].join("; ");
  const movementTip =
    motionEvents === 0 || orientationEvents === 0
      ? " Move the phone gently and retry if no events were received."
      : "";

  return `${apiSummary}. Permission: ${permissionSummary}. ${eventSummary}.${movementTip}`;
}
