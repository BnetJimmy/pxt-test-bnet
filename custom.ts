enum TargetCategory {
    //% block="任何物件"
    All = 0,
    //% block="人 (person)"
    Person = 1,
    //% block="貓 (cat)"
    Cat = 2,
    //% block="狗 (dog)"
    Dog = 3,
    //% block="車子 (car)"
    Car = 4,
    //% block="蘋果 (apple)"
    Apple = 5,
    //% block="杯子 (cup)"
    Cup = 6,
    //% block="瓶子 (bottle)"
    Bottle = 7,
    //% block="椅子 (chair)"
    Chair = 8,
    //% block="手機 (cell phone)"
    CellPhone = 9
}

//% weight=100 color=#0fbc11 icon="" block="iPad 控制"
namespace iPadConnect {
    let latestX = 0;
    let latestY = 0;
    let latestW = 0;
    let latestH = 0;
    let isConnected = false;

    function getCategoryString(category: TargetCategory): string {
        switch (category) {
            case TargetCategory.All: return "all";
            case TargetCategory.Person: return "person";
            case TargetCategory.Cat: return "cat";
            case TargetCategory.Dog: return "dog";
            case TargetCategory.Car: return "car";
            case TargetCategory.Apple: return "apple";
            case TargetCategory.Cup: return "cup";
            case TargetCategory.Bottle: return "bottle";
            case TargetCategory.Chair: return "chair";
            case TargetCategory.CellPhone: return "cell phone";
            default: return "all";
        }
    }

    /**
     * 初始化 iPad 藍牙連線 (必須放在「當啟動時」)
     */
    //% blockId=ipad_init block="初始化 iPad 藍牙連線"
    //% weight=100
    export function init() {
        bluetooth.startUartService();

        bluetooth.onBluetoothConnected(function () {
            isConnected = true;
            basic.showIcon(IconNames.Yes);
        });

        bluetooth.onBluetoothDisconnected(function () {
            isConnected = false;
            basic.showIcon(IconNames.No);
        });

        // 隱藏藍牙接收的複雜度，並防止學生在這裡放 pause()
        bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            let receivedString = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine));

            // 檢查是否包含逗號 (處理座標格式 X,Y,W,H 或 X,Y)
            let commaIndex = receivedString.indexOf(",");
            if (commaIndex > 0) {
                let p1 = receivedString.indexOf(",");
                let p2 = receivedString.indexOf(",", p1 + 1);
                let p3 = receivedString.indexOf(",", p2 + 1);

                if (p2 > 0 && p3 > 0) {
                    // X,Y,W,H
                    latestX = parseFloat(receivedString.substr(0, p1));
                    latestY = parseFloat(receivedString.substr(p1 + 1, p2 - p1 - 1));
                    latestW = parseFloat(receivedString.substr(p2 + 1, p3 - p2 - 1));
                    latestH = parseFloat(receivedString.substr(p3 + 1));
                } else if (p1 > 0) {
                    // 舊版只有 X,Y
                    latestX = parseFloat(receivedString.substr(0, p1));
                    latestY = parseFloat(receivedString.substr(p1 + 1));
                    latestW = 0;
                    latestH = 0;
                }

                // 觸發自訂的座標事件
                control.raiseEvent(31415, 1);
            } else {
                // 如果沒有逗號，當作一般文字指令處理
                // 將收到的文字儲存，並觸發指令事件
                latestCommand = receivedString.trim();
                control.raiseEvent(31415, 2);
            }
        });
    }

    let latestCommand = "";

    /**
     * 當收到 iPad 傳來的座標資料時執行
     */
    //% blockId=ipad_on_data block="當收到 iPad 座標資料"
    //% weight=90
    export function onDataReceived(body: () => void): void {
        control.onEvent(31415, 1, body);
    }

    /**
     * 設定 iPad 上的 AI 追蹤目標
     * @param category 欲追蹤的目標類別
     */
    //% blockId=ipad_set_target block="設定追蹤目標為 %category"
    //% weight=85
    export function setTrackingTarget(category: TargetCategory) {
        let catStr = getCategoryString(category);
        sendToiPad("TARGET:" + catStr);
    }

    /**
     * 當收到 iPad 傳來的文字指令時執行
     */
    //% blockId=ipad_on_command block="當收到 iPad 文字指令"
    //% weight=80
    export function onCommandReceived(body: () => void): void {
        control.onEvent(31415, 2, body);
    }

    /**
     * 取得最新收到的 X 座標
     */
    //% blockId=ipad_get_x block="取得最新 X 座標 (0~1)"
    //% weight=70
    export function getX(): number {
        return latestX;
    }

    /**
     * 取得最新收到的 Y 座標
     */
    //% blockId=ipad_get_y block="取得最新 Y 座標 (0~1)"
    //% weight=60
    export function getY(): number {
        return latestY;
    }

    /**
     * 取得最新收到的物件寬度 (Width)
     */
    //% blockId=ipad_get_w block="取得最新寬度 (0~1)"
    //% weight=58
    export function getW(): number {
        return latestW;
    }

    /**
     * 取得最新收到的物件高度 (Height)
     */
    //% blockId=ipad_get_h block="取得最新高度 (0~1)"
    //% weight=57
    export function getH(): number {
        return latestH;
    }

    /**
     * 取得最新收到的文字指令 (例如 START, STOP, END)
     */
    //% blockId=ipad_get_cmd block="取得最新指令"
    //% weight=55
    export function getCommand(): string {
        return latestCommand;
    }

    /**
     * 傳送訊息給 iPad
     * @param msg 要傳送的文字訊息, eg: "HELLO"
     */
    //% blockId=ipad_send block="傳送文字 %msg 給 iPad"
    //% weight=50
    export function sendToiPad(msg: string) {
        bluetooth.uartWriteString(msg + "\n");
    }

    // ==========================================
    // 機器手臂輔助控制區 (平滑馬達與測試)
    // ==========================================

    let targetS1S2 = 90;
    let targetS3 = 90;
    let targetS4 = 90;

    let currentS1S2 = 90;
    let currentS3 = 90;
    let currentS4 = 90;

    let armUpdateInterval = 50; // 每 50ms 更新一次馬達角度
    let armStepSize = 2; // 每次最多移動 2 度，確保平滑不損壞馬達

    /**
     * 初始化並啟動平滑機器手臂控制背景任務
     * 必須放在啟動區
     */
    //% blockId=arm_init_smooth block="啟動平滑機器手臂控制"
    //% weight=45
    export function initSmoothArm() {
        control.inBackground(function () {
            while (true) {
                // S4: 底座左右
                if (currentS4 < targetS4) currentS4 = Math.min(currentS4 + armStepSize, targetS4);
                if (currentS4 > targetS4) currentS4 = Math.max(currentS4 - armStepSize, targetS4);
                pins.servoWritePin(AnalogPin.P4, currentS4);

                // S1, S2: 手臂上下 (假設 S1 接 P1, S2 接 P2，且方向相同)
                if (currentS1S2 < targetS1S2) currentS1S2 = Math.min(currentS1S2 + armStepSize, targetS1S2);
                if (currentS1S2 > targetS1S2) currentS1S2 = Math.max(currentS1S2 - armStepSize, targetS1S2);
                pins.servoWritePin(AnalogPin.P1, currentS1S2);
                pins.servoWritePin(AnalogPin.P2, currentS1S2);

                // S3: 夾爪 (假設 S3 接 P3)
                if (currentS3 < targetS3) currentS3 = Math.min(currentS3 + armStepSize, targetS3);
                if (currentS3 > targetS3) currentS3 = Math.max(currentS3 - armStepSize, targetS3);
                pins.servoWritePin(AnalogPin.P3, currentS3);

                basic.pause(armUpdateInterval);
            }
        });
    }

    /**
     * 設定 S4 底座(左右) 目標角度，馬達會平滑轉動過去
     */
    //% blockId=arm_set_s4 block="設定 S4 底座角度為 %angle 度"
    //% angle.min=0 angle.max=180
    //% weight=44
    export function setS4Target(angle: number) {
        targetS4 = Math.clamp(0, 180, angle);
    }

    /**
     * 設定 S1, S2 手臂(上下) 目標角度，馬達會平滑轉動過去
     */
    //% blockId=arm_set_s1s2 block="設定 S1&S2 手臂角度為 %angle 度"
    //% angle.min=0 angle.max=180
    //% weight=43
    export function setS1S2Target(angle: number) {
        targetS1S2 = Math.clamp(0, 180, angle);
    }

    /**
     * 設定 S3 夾爪 目標角度，馬達會平滑轉動過去
     */
    //% blockId=arm_set_s3 block="設定 S3 夾爪角度為 %angle 度"
    //% angle.min=0 angle.max=180
    //% weight=42
    export function setS3Target(angle: number) {
        targetS3 = Math.clamp(0, 180, angle);
    }

}
