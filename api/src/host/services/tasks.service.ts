
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventManagerService, UserManagerService } from '../../manager/services';
import { ConfigService } from '@nestjs/config';
import { WEB_PUSH_PRIVATE_KEY, WEB_PUSH_PUBLIC_KEY } from '../../utility/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private eventManagerService: EventManagerService,
    private readonly userManagerService: UserManagerService,
    private readonly configService: ConfigService
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleCron(): Promise<void> {
    const events = await this.eventManagerService.getPublicEvents();
    const currentDate = new Date()
    const currentDateEvents = events.filter(x => {
      const [year, month, day] = x.date.toString().split('-')
      return currentDate.getFullYear() === +year && (currentDate.getMonth() + 1) === +month && currentDate.getDate() === +day
    })
    if (currentDateEvents.length) {
      const webPushToken = await this.userManagerService.getWebPushToken()
      const options = {
        vapidDetails: {
          subject: 'mailto:publicevents@myevents.com',
          publicKey: this.configService.get(WEB_PUSH_PUBLIC_KEY),
          privateKey: this.configService.get(WEB_PUSH_PRIVATE_KEY),
        },
        TTL: 60,
      };
      currentDateEvents.forEach(x => {
        webpush.sendNotification(
          webPushToken,
          JSON.stringify({
            notification: {
              title: `My Events: ${x.name}`,
              body: `Description: ${x.description}\nDate: ${x.date}`,
              badge: '/assets/icons/icon-96x96.png',
              icon: '/assets/icons/icon-152x152.png',
              actions: [{
                action: 'open',
                title: 'Open My Events'
              }],
              data: {
                onActionClick: {
                  default: { operation: 'openWindow' },
                  open: {
                    operation: 'focusLastFocusedOrOpen',
                    url: '/',
                  },
                },
            },
            },
          }),
          options
        ).then((log) => {
          this.logger.log('Push notification sent.');
          this.logger.log(log);
        }).catch((error) => {
          this.logger.error(error);
        });
      })
    }
  }
}
