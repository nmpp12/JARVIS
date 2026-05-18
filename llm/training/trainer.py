     def train(self) -> Dict:
         """Run the full training loop."""
         print(f"\n{'='*60}")
         print(f"MOM Training")
         print(f"{'='*60}")
         print(f"Model parameters: {self.model.num_parameters():,}")
         print(f"Device: {self.device}")
         print(f"Effective batch size: {self.config.effective_batch_size}")
         print(f"Total steps: {self.total_steps:,}")
         print(f"Precision: {self.config.dtype}")
         print(f"{'='*60}\n")

         self.model.train()
         start_time = time.time()
         tokens_processed = 0
         running_loss = 0.0
         num_loss_updates = 0
         early_stop = False

         for epoch in range(self.config.num_epochs):
             self.epoch = epoch
             self.optimizer.zero_grad()

             for step, batch in enumerate(self.train_loader):
                 # Move batch to device - handle both dict and tuple formats
                 if isinstance(batch, dict):
                     input_ids = batch["input_ids"].to(self.device)
                     labels = batch["labels"].to(self.device)
                 else:
                     # Handle tuple format: (input_ids, labels)
                     input_ids = batch[0].to(self.device)
                     labels = batch[1].to(self.device)

                 # Forward pass with mixed precision
                 if self.config.use_amp and self.config.dtype != "float32":
                     with torch.amp.autocast("cuda", dtype=self.config.torch_dtype):
                         outputs = self.model(input_ids=input_ids, labels=labels,
                                              label_smoothing=self.config.label_smoothing)
                         loss = outputs["loss"] / self.config.gradient_accumulation_steps
                 else:
                     outputs = self.model(input_ids=input_ids, labels=labels,
                                          label_smoothing=self.config.label_smoothing)
                     loss = outputs["loss"] / self.config.gradient_accumulation_steps

                 # Backward pass
                 if self.scaler:
                     self.scaler.scale(loss).backward()
                 else:
                     loss.backward()

                 running_loss += loss.item()
                 tokens_processed += input_ids.numel()

                 # Gradient accumulation step
                 if (step + 1) % self.config.gradient_accumulation_steps == 0:
                     # Gradient clipping
                     if self.scaler:
                         self.scaler.unscale_(self.optimizer)
                     grad_norm = torch.nn.utils.clip_grad_norm_(
                         self.model.parameters(), self.config.max_grad_norm
                     )

                     # Optimizer step
                     if self.scaler:
                         self.scaler.step(self.optimizer)
                         self.scaler.update()
                     else:
                         self.optimizer.step()

                     self.scheduler.step()
                     self.optimizer.zero_grad()
                     self.global_step += 1
                     num_loss_updates += 1

                     # Logging
                     if self.global_step % self.config.log_every_steps == 0:
                         avg_loss = running_loss / num_loss_updates
                         elapsed = time.time() - start_time
                         tokens_per_sec = tokens_processed / elapsed
                         current_lr = self.scheduler.get_last_lr()[0]
                         perplexity = math.exp(min(avg_loss * self.config.gradient_accumulation_steps, 20))

                         log_entry = {
                             "step": self.global_step,
                             "epoch": epoch,
                             "loss": avg_loss * self.config.gradient_accumulation_steps,
                             "perplexity": perplexity,
                             "lr": current_lr,
                             "grad_norm": grad_norm.item() if isinstance(grad_norm, torch.Tensor) else grad_norm,
                             "tokens_per_sec": tokens_per_sec,
                             "elapsed_sec": elapsed,
                         }
                         self.training_log.append(log_entry)

                         print(
                             f"Step {self.global_step:>6d}/{self.total_steps} | "
                             f"Loss: {log_entry['loss']:.4f} | "
                             f"PPL: {perplexity:.2f} | "
                             f"LR: {current_lr:.2e} | "
                             f"Grad: {log_entry['grad_norm']:.3f} | "
                             f"Tok/s: {tokens_per_sec:.0f}",
                             flush=True,
                         )

                         if self.wandb_run:
                             import wandb
                             wandb.log(log_entry, step=self.global_step)

                         running_loss = 0.0
                         num_loss_updates = 0

                     # Evaluation
                     early_stop = False
                     if (
                         self.eval_loader
                         and self.global_step % self.config.eval_every_steps == 0
                     ):
                         eval_loss = self.evaluate()
                         self.model.train()

                         if eval_loss < self.best_eval_loss:
                             self.best_eval_loss = eval_loss
                             self._evals_without_improvement = 0
                             self.save_checkpoint("best")
                         else:
                             self._evals_without_improvement += 1
                             patience = self.config.early_stopping_patience
                             if patience > 0 and self._evals_without_improvement >= patience:
                                 print(
                                     f"\n  Early stopping: eval loss hasn't improved for "
                                     f"{patience} evaluations (best={self.best_eval_loss:.4f})."
                                 )
                                 early_stop = True

                     # Checkpointing
                     if self.global_step % self.config.save_every_steps == 0:
                         self.save_checkpoint(f"step_{self.global_step}")

                     # Max steps / early stopping check
                     if early_stop:
                         break
                     if self.config.max_steps and self.global_step >= self.config.max_steps:
                         break

             if early_stop:
                 break
             if self.config.max_steps and self.global_step >= self.config.max_steps:
                 break

         # Final save
         self.save_checkpoint("final")
         total_time = time.time() - start_time

         summary = {
             "total_steps": self.global_step,
             "total_time_sec": total_time,
             "total_tokens": tokens_processed,
             "final_loss": self.training_log[-1]["loss"] if self.training_log else 0,
             "best_eval_loss": self.best_eval_loss,
         }

         # Save training log
         log_path = os.path.join(self.config.log_dir, "training_log.json")
         with open(log_path, "w") as f:
             json.dump(self.training_log, f, indent=2)

         print(f"\n{'='*60}")
         print(f"Training Complete!")
         print(f"Total steps: {self.global_step:,}")
         print(f"Total time: {total_time / 3600:.2f} hours")
         print(f"Tokens processed: {tokens_processed:,}")
         print(f"{'='*60}")

         return summary
