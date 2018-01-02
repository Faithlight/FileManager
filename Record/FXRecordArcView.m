//
//  FXRecordArcView.m
//  FXRecordArc
//
//  Created by 方 霄 on 14-6-10.
//  Copyright (c) 2014年 方 霄. All rights reserved.
//

#import "FXRecordArcView.h"

@interface FXRecordArcView (){
    int soundMeters[SOUND_METER_COUNT];
}

@property(readwrite, nonatomic, strong) NSDictionary *recordSettings;
@property(readwrite, nonatomic, strong) AVAudioRecorder *recorder;
@property(readwrite, nonatomic, strong) NSString *recordPath;
@property(readwrite, nonatomic, strong) NSTimer *timer;
@property(readwrite, nonatomic, strong) UILabel *timeLabel;
@property(readwrite, nonatomic, assign) CGFloat recordTime;
@property(readwrite, nonatomic, assign) CGRect hudRect;

@end

@implementation FXRecordArcView

- (id)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self) {
        self.recordSettings = @{AVFormatIDKey : @(kAudioFormatLinearPCM), AVEncoderBitRateKey:@(16),AVEncoderAudioQualityKey : @(AVAudioQualityMax), AVSampleRateKey : @(8000.0), AVNumberOfChannelsKey : @(1)};
        for(int i=0; i<SOUND_METER_COUNT; i++) {
            soundMeters[i] = SILENCE_VOLUME;
        }
        self.backgroundColor = [UIColor clearColor];
        self.timeLabel = [[UILabel alloc] initWithFrame:CGRectMake(0, 0, frame.size.width / 2, 30)];
        self.timeLabel.font = [UIFont fontWithName:@"HelveticaNeue-Thin" size:28];
        self.timeLabel.center = CGPointMake(frame.size.width / 2.0 + 2, frame.size.height );
        [self.timeLabel setTextAlignment:NSTextAlignmentCenter];
        [self addSubview:self.timeLabel];
        self.hudRect = CGRectMake(0, 0, frame.size.width, frame.size.height - 30);
    }
    return self;
}
- (CGFloat)getRecordTime {
    return self.recordTime;
}
- (void)startForFilePath:(NSString *)filePath{
    if (self.recordTime > 0.0) {
        [self.recorder record];
        self.timer = [NSTimer scheduledTimerWithTimeInterval:WAVE_UPDATE_FREQUENCY target:self selector:@selector(updateMeters) userInfo:nil repeats:YES];
        return ;
    }
    self.recordTime = 0.0;
    AVAudioSession *audioSession = [AVAudioSession sharedInstance];
	NSError *err = nil;
	[audioSession setCategory :AVAudioSessionCategoryPlayAndRecord error:&err];
	if(err){
        NSLog(@"audioSession: %@ %ld %@", [err domain], (long)[err code], [[err userInfo] description]);
        //return;
	}
	[audioSession setActive:YES error:&err];
	err = nil;  
//	if(err){
//        NSLog(@"audioSession: %@ %ld %@", [err domain], (long)[err code], [[err userInfo] description]);
//        return;
//	}
    self.recordPath = filePath;
    NSURL *url = [NSURL fileURLWithPath:filePath];
    NSData *existedData = [NSData dataWithContentsOfFile:[url path] options:NSDataReadingMapped error:&err];
    if (existedData) {
        NSFileManager *fm = [NSFileManager defaultManager];
        [fm removeItemAtPath:[url path] error:&err];
    }
    
    self.recorder = [[AVAudioRecorder alloc] initWithURL:url settings:self.recordSettings error:&err];
    self.recorder.delegate = self;
    [self.recorder setMeteringEnabled:YES];
    [self.recorder prepareToRecord];
    //[self.recorder recordForDuration:MAX_RECORD_DURATION];
    [self.recorder record];
        self.timer = [NSTimer scheduledTimerWithTimeInterval:WAVE_UPDATE_FREQUENCY target:self selector:@selector(updateMeters) userInfo:nil repeats:YES];
}
- (void)commitRecording {
    [self.recorder stop];
}
- (void)startRecording {
    [self.recorder record];
}
- (void)pauseRecording {
    [self.timer invalidate];
    [self.recorder pause];
}
- (void)deleteRecording {
    [self.recorder deleteRecording];
    self.recordTime = 0.0;
    self.timeLabel.text = @"";
}
- (BOOL)isRecordering {
    return self.recorder.recording;
}
- (void)updateMeters{
    [self.recorder updateMeters];
//    if (self.recordTime > 3600.0) {
//        return;
//    }
    self.recordTime += WAVE_UPDATE_FREQUENCY;
    int hour = self.recordTime / 3600;
    int min = (int)(self.recordTime / 60) % 60;
    int sec = (int)self.recordTime % 60;
    [self.timeLabel setText:[NSString stringWithFormat:@"%d时%d分%d秒", hour, min, sec]];
    if ([self.recorder averagePowerForChannel:0] < -SILENCE_VOLUME) {
        [self addSoundMeterItem:SILENCE_VOLUME];
        return;
    }
    [self addSoundMeterItem:[self.recorder averagePowerForChannel:0]];
    NSLog(@"volume:%f",[self.recorder averagePowerForChannel:0]);
}

- (void)addSoundMeterItem:(int)lastValue{
    for(int i=0; i<SOUND_METER_COUNT - 1; i++) {
        soundMeters[i] = soundMeters[i+1];
    }
    soundMeters[SOUND_METER_COUNT - 1] = lastValue;
    
    [self setNeedsDisplay];
}

#pragma mark - Drawing operations

- (void)drawRect:(CGRect)rect {
    CGContextRef context = UIGraphicsGetCurrentContext();
    int baseLine = 250;
    static int multiplier = 1;
    int maxLengthOfWave = 45;
    int maxValueOfMeter = 400;
    int yHeights[6];
    float segement[6] = {0.05, 0.2, 0.35, 0.25, 0.1, 0.05};
    
    [[UIColor colorWithRed:55/255.0 green:180/255.0 blue:252/255.0 alpha:1] set];
    CGContextSetLineWidth(context, 2.0);
    
    
    for(int x = SOUND_METER_COUNT - 1; x >= 0; x--)
    {
        int multiplier_i = ((int)x % 2) == 0 ? 1 : -1;
        CGFloat y = ((maxValueOfMeter * (maxLengthOfWave - abs(soundMeters[(int)x]))) / maxLengthOfWave);
        yHeights[SOUND_METER_COUNT - 1 - x] = multiplier_i * y * segement[SOUND_METER_COUNT - 1 - x]  * multiplier+ baseLine;
        //NSDLOG(@"i:%d, f:%d",5 + x - SOUND_METER_COUNT + 1, yHeights[5 + x - SOUND_METER_COUNT + 1]);
    }
    [self drawLinesWithContext:context BaseLine:baseLine HeightArray:yHeights lineWidth:2.0 alpha:0.8 percent:1.0 segementArray:segement];
    [self drawLinesWithContext:context BaseLine:baseLine HeightArray:yHeights lineWidth:1.0 alpha:0.4 percent:0.66 segementArray:segement];
    [self drawLinesWithContext:context BaseLine:baseLine HeightArray:yHeights lineWidth:1.0 alpha:0.2 percent:0.33 segementArray:segement];
    multiplier = -multiplier;
}

- (void) drawLinesWithContext:(CGContextRef)context BaseLine:(float)baseLine HeightArray:(int*)yHeights lineWidth:(CGFloat)width alpha:(CGFloat)alpha percent:(CGFloat)percent segementArray:(float *)segement{
    
    CGFloat start = 0;
    [[UIColor colorWithRed:55/255.0 green:180/255.0 blue:252/255.0 alpha:1] set];
    CGContextSetLineWidth(context, width);
    
    for (int i = 0; i < 6; i++) {
        if (i % 2 == 0) {
            CGContextMoveToPoint(context, start, baseLine);
            
            CGContextAddCurveToPoint(context, SCREEN_WIDTH *segement[i] / 2 + start, (yHeights[i] - baseLine)*percent + baseLine, SCREEN_WIDTH *segement[i] + SCREEN_WIDTH *segement[i + 1] / 2 + start, (yHeights[i + 1] - baseLine)*percent + baseLine,SCREEN_WIDTH *segement[i] + SCREEN_WIDTH *segement[i + 1] + start , baseLine);
            start += SCREEN_WIDTH *segement[i] + SCREEN_WIDTH *segement[i + 1];
        }
    }
    
    CGContextStrokePath(context);
}

- (void)audioRecorderEncodeErrorDidOccur:(AVAudioRecorder *)recorder error:(NSError *)error{
    NSLog(@"error : %@",error);
}

- (void)audioRecorderDidFinishRecording:(AVAudioRecorder *)recorder successfully:(BOOL)flag{
    [self.timer invalidate];
    if ([self.delegate respondsToSelector:@selector(recordArcView:voiceRecorded:length:)]) {
        [self.delegate recordArcView:self voiceRecorded:self.recordPath length:self.recordTime];
    }
    [self setNeedsDisplay];
}


- (void)dealloc{
    [self.timer invalidate];
    self.timer = nil;
    self.recorder.delegate = nil;
}

@end
