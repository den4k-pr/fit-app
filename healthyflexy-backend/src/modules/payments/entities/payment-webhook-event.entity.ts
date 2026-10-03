import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Оброблені події вебхуків (id події провайдера): повторна доставка тієї ж події нічого не змінює */
@Entity({ name: 'payment_webhook_events' })
export class PaymentWebhookEvent {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  provider: string;

  @Column({ type: 'varchar', length: 120 })
  type: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'received_at' })
  receivedAt: Date;
}
