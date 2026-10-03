insert into categories (name) values ('Mobile'),('Fridge'),('AC'),('LED'),('Bike'),('Battery'),('Washing machine');

insert into message_templates (key, channel, body) values
('reminder', 'whatsapp', 'Assalam o Alaikum {{name}}, your installment of Rs {{amount}} for {{month}} is due between 1st–5th. — Khalil Electronics'),
('received', 'whatsapp', 'Dear {{name}}, we received Rs {{amount}}. Thank you. — Khalil Electronics'),
('overdue',  'whatsapp', 'Dear {{name}}, your installment of Rs {{amount}} is overdue. Please pay today to avoid a visit. — Khalil Electronics'),
('closed',   'whatsapp', 'Congratulations {{name}}, your account is fully paid and closed. — Khalil Electronics'),
('reminder_sms', 'sms', '{{name}}: installment Rs {{amount}} due 1-5 {{month}}. Khalil Electronics');
