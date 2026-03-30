enum TargetCategory {
    //% block="任何物件"
    All = -1,
    //% block="人 (person)"
    Person = 0,
    //% block="貓 (cat)"
    Cat = 15,
    //% block="狗 (dog)"
    Dog = 16,
    //% block="車子 (car)"
    Car = 2,
    //% block="蘋果 (apple)"
    Apple = 47,
    //% block="杯子 (cup)"
    Cup = 41,
    //% block="瓶子 (bottle)"
    Bottle = 39,
    //% block="椅子 (chair)"
    Chair = 56,
    //% block="手機 (cell phone)"
    CellPhone = 67
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
            default:
                // 將 Enum 的數值直接轉成字串傳送 (例如傳送 "0", "1", "47")
                // 注意：在 TargetCategory 中，Apple 目前被設定為 5。
                // 如果要對應 YOLOv8 原生 Index，可能需要修改 enum 對應的數值。
                return category.toString();
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
            let rawString = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine));
            let receivedString = rawString.trim();

            // 【除錯用】把收到的原始字串印到序列埠
            serial.writeLine("RX: " + receivedString);

            // 檢查是否包含逗號 (處理座標格式 X,Y,W,H 或 X,Y)
            let commaIndex = receivedString.indexOf(",");
            if (commaIndex > 0) {
                // 處理多物件格式: "ID,X,Y,W,H;ID,X,Y,W,H" 或 "ID,X,Y;ID,X,Y"
                let objects = receivedString.split(";");

                // 清空舊的陣列
                detectedObjects = [];

                for (let i = 0; i < objects.length; i++) {
                    let objData = objects[i].split(",");
                    if (objData.length >= 5) {
                        // XYWH 模式: ID, X, Y, W, H
                        detectedObjects.push({
                            id: parseInt(objData[0]),
                            x: parseFloat(objData[1]),
                            y: parseFloat(objData[2]),
                            w: parseFloat(objData[3]),
                            h: parseFloat(objData[4])
                        });
                    } else if (objData.length >= 3) {
                        // XY 模式: ID, X, Y
                        detectedObjects.push({
                            id: parseInt(objData[0]),
                            x: parseFloat(objData[1]),
                            y: parseFloat(objData[2]),
                            w: 0,
                            h: 0
                        });
                    }
                }

                if (detectedObjects.length > 0) {
                    // 為了相容舊版，把第一個物件的資料存入 latest 變數
                    latestX = detectedObjects[0].x;
                    latestY = detectedObjects[0].y;
                    latestW = detectedObjects[0].w;
                    latestH = detectedObjects[0].h;
                } else {
                    latestX = -1;
                    latestY = -1;
                    latestW = -1;
                    latestH = -1;
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

    // 儲存多個偵測物件的陣列
    interface DetectedObject {
        id: number;
        x: number;
        y: number;
        w: number;
        h: number;
    }
    let detectedObjects: DetectedObject[] = [];

    /**
     * 取得偵測到的物件數量
     */
    //% blockId=ipad_get_object_count block="取得偵測到的物件數量"
    //% weight=75
    export function getObjectCount(): number {
        return detectedObjects.length;
    }

    /**
     * 取得指定物件的 X 座標 (索引從 0 開始)
     * @param index 物件索引
     */
    //% blockId=ipad_get_object_x block="取得第 %index 個物件的 X 座標"
    //% weight=74
    export function getObjectX(index: number): number {
        if (index >= 0 && index < detectedObjects.length) {
            return detectedObjects[index].x;
        }
        return -1;
    }

    /**
     * 取得指定物件的 Y 座標 (索引從 0 開始)
     * @param index 物件索引
     */
    //% blockId=ipad_get_object_y block="取得第 %index 個物件的 Y 座標"
    //% weight=73
    export function getObjectY(index: number): number {
        if (index >= 0 && index < detectedObjects.length) {
            return detectedObjects[index].y;
        }
        return -1;
    }

    /**
     * 取得指定物件的寬度 (索引從 0 開始)
     * @param index 物件索引
     */
    //% blockId=ipad_get_object_w block="取得第 %index 個物件的寬度"
    //% weight=72
    export function getObjectW(index: number): number {
        if (index >= 0 && index < detectedObjects.length) {
            return detectedObjects[index].w;
        }
        return -1;
    }

    /**
     * 取得指定物件的高度 (索引從 0 開始)
     * @param index 物件索引
     */
    //% blockId=ipad_get_object_h block="取得第 %index 個物件的高度"
    //% weight=71
    export function getObjectH(index: number): number {
        if (index >= 0 && index < detectedObjects.length) {
            return detectedObjects[index].h;
        }
        return -1;
    }

    /**
     * 取得指定物件的類別 ID (索引從 0 開始)
     * @param index 物件索引
     */
    //% blockId=ipad_get_object_id block="取得第 %index 個物件的類別 ID"
    //% weight=70
    export function getObjectId(index: number): number {
        if (index >= 0 && index < detectedObjects.length) {
            return detectedObjects[index].id;
        }
        return -1;
    }

    /** 陣列中第一個 id 符合的索引；找不到為 -1（iPad 已依分數排序時通常即最高分） */
    function indexOfFirstObjectWithId(targetId: number): number {
        for (let i = 0; i < detectedObjects.length; i++) {
            if (detectedObjects[i].id == targetId) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 依類別 ID 取得第一個符合物件的 X 座標 (0~100%；找不到回傳 -1)
     */
    //% blockId=ipad_get_object_x_by_target_id block="依類別 ID %targetId 取得 X 座標"
    //% weight=69
    export function getObjectXByTargetId(targetId: number): number {
        let idx = indexOfFirstObjectWithId(targetId);
        if (idx >= 0) {
            return detectedObjects[idx].x;
        }
        return -1;
    }

    /**
     * 依類別 ID 取得第一個符合物件的 Y 座標 (0~100%；找不到回傳 -1)
     */
    //% blockId=ipad_get_object_y_by_target_id block="依類別 ID %targetId 取得 Y 座標"
    //% weight=68
    export function getObjectYByTargetId(targetId: number): number {
        let idx = indexOfFirstObjectWithId(targetId);
        if (idx >= 0) {
            return detectedObjects[idx].y;
        }
        return -1;
    }

    /**
     * 依類別 ID 取得第一個符合物件的寬度 (0~100%；找不到回傳 -1)
     */
    //% blockId=ipad_get_object_w_by_target_id block="依類別 ID %targetId 取得寬度"
    //% weight=67
    export function getObjectWByTargetId(targetId: number): number {
        let idx = indexOfFirstObjectWithId(targetId);
        if (idx >= 0) {
            return detectedObjects[idx].w;
        }
        return -1;
    }

    /**
     * 依類別 ID 取得第一個符合物件的高度 (0~100%；找不到回傳 -1)
     */
    //% blockId=ipad_get_object_h_by_target_id block="依類別 ID %targetId 取得高度"
    //% weight=66
    export function getObjectHByTargetId(targetId: number): number {
        let idx = indexOfFirstObjectWithId(targetId);
        if (idx >= 0) {
            return detectedObjects[idx].h;
        }
        return -1;
    }

    /**
     * 切換傳輸模式 (XYWH 或 僅 XY)
     * @param mode 模式 (例如 "XYWH" 或 "XY")
     */
    //% blockId=ipad_set_transmit_mode block="設定傳輸模式為 %mode"
    //% weight=83
    export function setTransmitMode(mode: string) {
        sendToiPad("MODE:" + mode);
    }

    /**
     * 當收到 iPad 傳來的座標資料時執行
     */
    //% blockId=ipad_on_data block="當收到 iPad 座標資料"
    //% weight=90
    export function onDataReceived(body: () => void): void {
        control.onEvent(31415, 1, body);
    }

    /**
     * 設定 iPad 上的 AI 追蹤目標 (由內建清單選擇)
     * @param category 欲追蹤的目標類別
     */
    //% blockId=ipad_set_target block="設定追蹤目標為 %category"
    //% weight=85
    export function setTrackingTarget(category: TargetCategory) {
        let catStr = getCategoryString(category);
        sendToiPad("TARGET:" + catStr);
    }

    /**
     * 設定 iPad 上的 AI 追蹤目標 (自行輸入 ID 數字)
     * @param id 目標的編號 (請參考 iPad 網頁上的清單)
     */
    //% blockId=ipad_set_target_by_id block="設定追蹤目標為 ID %id"
    //% weight=84
    export function setTrackingTargetById(id: number) {
        sendToiPad("TARGET:" + id);
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
    //% blockId=ipad_get_x block="取得最新 X 座標 (0~100%)"
    //% weight=70
    export function getX(): number {
        return latestX;
    }

    /**
     * 取得最新收到的 Y 座標
     */
    //% blockId=ipad_get_y block="取得最新 Y 座標 (0~100%)"
    //% weight=60
    export function getY(): number {
        return latestY;
    }

    /**
     * 取得最新收到的物件寬度 (Width)
     */
    //% blockId=ipad_get_w block="取得最新寬度 (0~100%)"
    //% weight=58
    export function getW(): number {
        return latestW;
    }

    /**
     * 取得最新收到的物件高度 (Height)
     */
    //% blockId=ipad_get_h block="取得最新高度 (0~100%)"
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

}
