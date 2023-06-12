export const sesAttr = {
    // Email addresses will be added to the verified list and will be sent a confirmation email
    emailList: [
        'awsalvin@amazon.com',
    ],

    // Email addresses to subscribe to SNS topic for delivery notifications
    notifList: [
        'alvin@vaughns.net',
    ],
    // Notify on delivery status inc Send, Delivery, Open
    sendDeliveryNotifications: true,
};

export const testEmailAddress = "alvin.vaughn@outlook.com"

export const domainAttr = {
    // zoneName for the email domain is required. hostedZoneId for a Route53 domain is optional.
    zoneName: 'dev.technetcentral.com',
    hostedZoneId: '',
};

export const solutionName = "snq-pipes-sns-ses-testing"
export const costcenter = "lalith"
export const environment = "dev"