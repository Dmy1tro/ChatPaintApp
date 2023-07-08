import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Observable, Subject, of, takeUntil } from 'rxjs';
import { DrawModel } from 'src/app/services/paint.service';

@Component({
  selector: 'app-paint',
  templateUrl: './paint.component.html',
  styleUrls: ['./paint.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaintComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() colors: string[] = ['#c0392b', '#591b2d', '#000066', '#b0145a', '#ab87e3', '#002600', '#198c78', '#ee502a'];
  @Input() defaultColor: string = this.colors[Math.floor(Math.random() * this.colors.length)];
  @Input() canvasClearEvent$: Observable<void> = of();
  @Input() drawEvent$: Observable<DrawModel> = of();

  @Output() onStartDrawing: EventEmitter<DrawModel> = new EventEmitter();
  @Output() onDrawing: EventEmitter<DrawModel> = new EventEmitter();
  @Output() onFinishDrawing: EventEmitter<DrawModel> = new EventEmitter();

  @ViewChild('canvas') canvasRef!: ElementRef;
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;

  colorToUse: string = this.defaultColor;
  showColorDropDownOptions: boolean = false;

  private destroy$ = new Subject<void>();

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.canvas = this.canvasRef.nativeElement as HTMLCanvasElement;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;

    this.context = this.canvas.getContext('2d')!;
    this.context.lineWidth = 3;
    this.context.lineCap = 'round';
    this.context.strokeStyle = this.colorToUse;

    this.canvas.onmousedown = (ev) => {
      // Only left mouse button click.
      if (ev.button !== 0) {
        return;
      }

      const x = ev.clientX - this.canvas.offsetLeft;
      const y = ev.clientY - this.canvas.offsetTop;

      this.context.beginPath();
      this.context.moveTo(x, y);

      this.onStartDrawing.emit({ status: 'Start', color: this.defaultColor, x: x, y: y, createdDate: new Date().toISOString()});
    };

    this.canvas.onmousemove = (ev) => {
      // If mouse down clicked
      // Only left mouse button click.
      if (ev.buttons !== 1 || ev.button !== 0) {
        return;
      }
      
      const x = ev.clientX - this.canvas.offsetLeft;
      const y = ev.clientY - this.canvas.offsetTop;
      const color = this.context.strokeStyle as string;
      this.context.lineTo(x, y);
      this.context.stroke();

      this.onDrawing.emit({ status: 'InProccess', color: color, x: x, y: y, createdDate: new Date().toISOString() });
    };

    this.canvas.onmouseup = (ev) => {
      // Only left mouse button click.
      if (ev.button !== 0) {
        return;
      }

      const x = ev.clientX - this.canvas.offsetLeft;
      const y = ev.clientY - this.canvas.offsetTop;
      const color = this.context.strokeStyle as string;
      this.context.lineTo(x, y);
      this.context.stroke();

      this.onFinishDrawing.emit({ status: 'Finish', color: color, x: x, y: y, createdDate: new Date().toISOString() });
    };

    this.canvasClearEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.context.clearRect(0, 0, this.canvas.width, this.canvas.height));

    this.drawEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe(drawModel => {
        this.context.strokeStyle = drawModel.color;

        if (drawModel.status === 'Start') {
          this.context.beginPath();
          this.context.moveTo(drawModel.x, drawModel.y);
        }
  
        if (drawModel.status === 'InProccess' || drawModel.status === 'Finish') {
          this.context.lineTo(drawModel.x, drawModel.y);
          this.context.stroke();
        }

        this.context.strokeStyle = this.colorToUse;
      });
  }

  setColor(color: string): void {
    this.colorToUse = color;
    this.context.strokeStyle = color;
    this.showColorDropDownOptions = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
