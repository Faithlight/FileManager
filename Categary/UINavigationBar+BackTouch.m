//
//  UINavigationBar+BackTouch.m
//  BicDroidEE
//
//  Created by 政委 on 2017/6/2.
//  Copyright © 2017年 BicDroid. All rights reserved.
//

#import "UINavigationBar+BackTouch.h"
    //修正返回bar触发范围过大问题
@implementation UINavigationBar (BackTouch)
-(UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    
    if ([self pointInside:point withEvent:event]) {
        self.userInteractionEnabled = YES;
    } else {
        self.userInteractionEnabled = NO;
    }
    
    return [super hitTest:point withEvent:event];
}
@end
