export interface NotificationModel {
    id: number;
    userId: number;
    title: string;
    isRead: boolean;
    isDeleted: boolean;
    createdAt: string;
    readAt: string;
    body: string;
    dataJson: string;
    type: string;
    targetUrl: string;
}